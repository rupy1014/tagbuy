"""Session management for Instagram clients"""
import json
import logging
import os
from datetime import datetime
from typing import Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages Instagram session files for persistence.

    Session files are stored as JSON and contain login cookies/tokens
    that can be reused to avoid re-authentication.
    """

    def __init__(self, sessions_dir: Optional[str] = None):
        self.sessions_dir = sessions_dir or settings.sessions_dir
        self._ensure_sessions_dir()

    def _ensure_sessions_dir(self) -> None:
        """Ensure the sessions directory exists"""
        os.makedirs(self.sessions_dir, exist_ok=True)

    def get_session_path(self, username: str) -> str:
        """Get the file path for a session"""
        return os.path.join(self.sessions_dir, f"{username}.json")

    def session_exists(self, username: str) -> bool:
        """Check if a session file exists"""
        return os.path.exists(self.get_session_path(username))

    def get_session_age(self, username: str) -> Optional[float]:
        """
        Get the age of a session file in seconds.

        Returns:
            Age in seconds, or None if session doesn't exist
        """
        session_path = self.get_session_path(username)
        if not os.path.exists(session_path):
            return None

        mtime = os.path.getmtime(session_path)
        return datetime.now().timestamp() - mtime

    def is_session_valid(
        self,
        username: str,
        max_age_hours: int = 24,
    ) -> bool:
        """
        Check if a session is still valid based on age.

        Args:
            username: Instagram username
            max_age_hours: Maximum age in hours before session is considered stale

        Returns:
            True if session exists and is not too old
        """
        age = self.get_session_age(username)
        if age is None:
            return False

        max_age_seconds = max_age_hours * 3600
        return age < max_age_seconds

    def delete_session(self, username: str) -> bool:
        """
        Delete a session file.

        Args:
            username: Instagram username

        Returns:
            True if session was deleted, False if it didn't exist
        """
        session_path = self.get_session_path(username)
        if os.path.exists(session_path):
            os.remove(session_path)
            logger.info(f"Deleted session for {username}")
            return True
        return False

    def list_sessions(self) -> Dict[str, Dict]:
        """
        List all available sessions with metadata.

        Returns:
            Dict of username -> session metadata
        """
        sessions = {}

        for filename in os.listdir(self.sessions_dir):
            if filename.endswith(".json"):
                username = filename[:-5]  # Remove .json
                session_path = self.get_session_path(username)

                try:
                    age = self.get_session_age(username)
                    mtime = os.path.getmtime(session_path)
                    size = os.path.getsize(session_path)

                    sessions[username] = {
                        "path": session_path,
                        "age_seconds": age,
                        "last_modified": datetime.fromtimestamp(mtime).isoformat(),
                        "size_bytes": size,
                        "is_valid": self.is_session_valid(username),
                    }
                except Exception as e:
                    logger.error(f"Error reading session {username}: {e}")
                    sessions[username] = {"error": str(e)}

        return sessions

    def cleanup_old_sessions(self, max_age_hours: int = 168) -> int:
        """
        Remove session files older than max_age_hours.

        Args:
            max_age_hours: Maximum age in hours (default: 7 days)

        Returns:
            Number of sessions deleted
        """
        deleted_count = 0

        for filename in os.listdir(self.sessions_dir):
            if filename.endswith(".json"):
                username = filename[:-5]
                if not self.is_session_valid(username, max_age_hours):
                    if self.delete_session(username):
                        deleted_count += 1

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old sessions")

        return deleted_count


# Global instance
session_manager = SessionManager()
