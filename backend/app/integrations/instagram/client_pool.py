"""Instagram client pool for managing multiple accounts"""
import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from app.config import settings
from app.core.exceptions import NoAvailableClientError
from app.integrations.instagram.client import InstagramClient

logger = logging.getLogger(__name__)


@dataclass
class ManagedClient:
    """A managed Instagram client with metadata"""
    client: InstagramClient
    username: str
    last_request_at: Optional[float] = None
    request_count: int = 0
    daily_request_count: int = 0
    daily_reset_at: Optional[datetime] = None
    is_available: bool = True
    cooldown_until: Optional[float] = None
    consecutive_errors: int = 0


class InstagramClientPool:
    """
    Pool of Instagram clients for load balancing and rate limit avoidance.

    Usage:
        pool = InstagramClientPool()
        await pool.initialize()
        client = await pool.get_client()
        user = await client.get_user_info("target")
    """

    def __init__(self):
        self._clients: Dict[str, ManagedClient] = {}
        self._current_index: int = 0
        self._lock = asyncio.Lock()
        self._initialized: bool = False

    @property
    def client_count(self) -> int:
        return len(self._clients)

    @property
    def available_clients(self) -> int:
        return sum(1 for c in self._clients.values() if self._is_client_available(c))

    async def initialize(self) -> None:
        """Initialize the client pool with configured accounts"""
        if self._initialized:
            return

        accounts = settings.get_instagram_accounts()
        if not accounts:
            logger.warning("No Instagram accounts configured")
            return

        for account in accounts:
            await self.add_client(
                username=account.username,
                password=account.password,
                proxy=account.proxy,
            )

        self._initialized = True
        logger.info(f"Initialized Instagram client pool with {self.client_count} clients")

    async def add_client(
        self,
        username: str,
        password: str,
        proxy: Optional[str] = None,
    ) -> bool:
        """
        Add a new client to the pool.

        Args:
            username: Instagram username
            password: Instagram password
            proxy: Optional proxy URL

        Returns:
            True if client was added successfully
        """
        if username in self._clients:
            logger.warning(f"Client {username} already exists in pool")
            return False

        session_path = os.path.join(settings.sessions_dir, f"{username}.json")

        client = InstagramClient(
            username=username,
            password=password,
            proxy=proxy,
            session_path=session_path,
        )

        try:
            await client.login()
            self._clients[username] = ManagedClient(
                client=client,
                username=username,
                daily_reset_at=datetime.utcnow(),
            )
            logger.info(f"Added client to pool: {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to add client {username}: {e}")
            return False

    async def remove_client(self, username: str) -> bool:
        """Remove a client from the pool"""
        if username in self._clients:
            del self._clients[username]
            logger.info(f"Removed client from pool: {username}")
            return True
        return False

    async def get_client(self) -> InstagramClient:
        """
        Get an available client from the pool using round-robin.

        Returns:
            An available InstagramClient

        Raises:
            NoAvailableClientError: If no clients are available
        """
        async with self._lock:
            if not self._clients:
                raise NoAvailableClientError()

            client_list = list(self._clients.values())
            attempts = len(client_list)

            for _ in range(attempts):
                managed = client_list[self._current_index]
                self._current_index = (self._current_index + 1) % len(client_list)

                if self._is_client_available(managed):
                    self._update_client_usage(managed)
                    return managed.client

            # No available clients
            raise NoAvailableClientError()

    async def get_specific_client(self, username: str) -> Optional[InstagramClient]:
        """Get a specific client by username"""
        managed = self._clients.get(username)
        if managed and self._is_client_available(managed):
            self._update_client_usage(managed)
            return managed.client
        return None

    def mark_client_error(self, username: str) -> None:
        """Mark a client as having encountered an error"""
        if username in self._clients:
            managed = self._clients[username]
            managed.consecutive_errors += 1

            # Put client in cooldown after 3 consecutive errors
            if managed.consecutive_errors >= 3:
                managed.cooldown_until = time.time() + 300  # 5 minutes
                managed.is_available = False
                logger.warning(f"Client {username} put in cooldown due to errors")

    def mark_client_success(self, username: str) -> None:
        """Mark a client as having succeeded"""
        if username in self._clients:
            managed = self._clients[username]
            managed.consecutive_errors = 0

    def mark_client_rate_limited(self, username: str) -> None:
        """Mark a client as rate limited"""
        if username in self._clients:
            managed = self._clients[username]
            managed.cooldown_until = time.time() + 60  # 1 minute cooldown
            managed.is_available = False
            logger.warning(f"Client {username} rate limited, cooling down")

    def _is_client_available(self, managed: ManagedClient) -> bool:
        """Check if a managed client is available for use"""
        now = time.time()

        # Check if in cooldown
        if managed.cooldown_until and now < managed.cooldown_until:
            return False

        # Reset cooldown if expired
        if managed.cooldown_until and now >= managed.cooldown_until:
            managed.cooldown_until = None
            managed.is_available = True
            managed.consecutive_errors = 0

        # Check daily limit
        if managed.daily_reset_at:
            if (datetime.utcnow() - managed.daily_reset_at).days >= 1:
                managed.daily_request_count = 0
                managed.daily_reset_at = datetime.utcnow()

        # Daily limit: 1000 requests
        if managed.daily_request_count >= 1000:
            return False

        # Check minimum interval since last request
        if managed.last_request_at:
            elapsed = now - managed.last_request_at
            if elapsed < settings.instagram_min_request_interval:
                return False

        return managed.is_available

    def _update_client_usage(self, managed: ManagedClient) -> None:
        """Update client usage statistics"""
        managed.last_request_at = time.time()
        managed.request_count += 1
        managed.daily_request_count += 1

    def get_pool_status(self) -> Dict:
        """Get current pool status"""
        return {
            "total_clients": self.client_count,
            "available_clients": self.available_clients,
            "clients": [
                {
                    "username": m.username,
                    "is_available": self._is_client_available(m),
                    "request_count": m.request_count,
                    "daily_request_count": m.daily_request_count,
                    "consecutive_errors": m.consecutive_errors,
                    "in_cooldown": m.cooldown_until is not None and time.time() < m.cooldown_until,
                }
                for m in self._clients.values()
            ]
        }


# Global instance
_pool: Optional[InstagramClientPool] = None


async def get_instagram_pool() -> InstagramClientPool:
    """Get the global Instagram client pool"""
    global _pool
    if _pool is None:
        _pool = InstagramClientPool()
        await _pool.initialize()
    return _pool
