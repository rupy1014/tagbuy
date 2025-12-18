"""Crawler scheduler for periodic discovery"""
import asyncio
import logging
from datetime import datetime, time
from typing import Optional

from app.crawler.discovery_service import InfluencerDiscoveryService
from app.core.database import async_session_maker

logger = logging.getLogger(__name__)


class CrawlerScheduler:
    """
    Scheduler for running discovery tasks.

    Schedule:
    - Daily discovery: 새벽 3시 - 새로운 인플루언서 발굴
    - Weekly update: 일요일 새벽 4시 - 기존 데이터 업데이트
    - Hourly light: 매시간 - 활성 캠페인 관련 인플루언서만

    Note: 프로덕션에서는 Celery Beat 사용 권장
    """

    def __init__(self):
        self._running = False
        self._tasks = []

    async def start(self):
        """Start the scheduler"""
        if self._running:
            logger.warning("Scheduler already running")
            return

        self._running = True
        logger.info("Starting crawler scheduler")

        # Create background tasks
        self._tasks = [
            asyncio.create_task(self._daily_discovery_loop()),
            asyncio.create_task(self._weekly_update_loop()),
        ]

    async def stop(self):
        """Stop the scheduler"""
        self._running = False
        for task in self._tasks:
            task.cancel()
        logger.info("Crawler scheduler stopped")

    async def _daily_discovery_loop(self):
        """Run daily discovery at 3 AM"""
        while self._running:
            try:
                now = datetime.now()
                # Calculate time until next 3 AM
                next_run = now.replace(hour=3, minute=0, second=0, microsecond=0)
                if now.hour >= 3:
                    next_run = next_run.replace(day=now.day + 1)

                wait_seconds = (next_run - now).total_seconds()
                logger.info(f"Next daily discovery in {wait_seconds / 3600:.1f} hours")

                await asyncio.sleep(wait_seconds)

                if self._running:
                    await self.run_daily_discovery()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Daily discovery loop error: {e}")
                await asyncio.sleep(3600)  # Wait an hour on error

    async def _weekly_update_loop(self):
        """Run weekly update on Sundays at 4 AM"""
        while self._running:
            try:
                now = datetime.now()
                # Calculate time until next Sunday 4 AM
                days_until_sunday = (6 - now.weekday()) % 7
                if days_until_sunday == 0 and now.hour >= 4:
                    days_until_sunday = 7

                next_run = now.replace(hour=4, minute=0, second=0, microsecond=0)
                next_run = next_run.replace(day=now.day + days_until_sunday)

                wait_seconds = (next_run - now).total_seconds()
                logger.info(f"Next weekly update in {wait_seconds / 86400:.1f} days")

                await asyncio.sleep(wait_seconds)

                if self._running:
                    await self.run_weekly_update()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Weekly update loop error: {e}")
                await asyncio.sleep(3600)

    async def run_daily_discovery(self):
        """Run daily discovery task"""
        logger.info("Starting daily discovery")

        async with async_session_maker() as session:
            service = InfluencerDiscoveryService(session)

            try:
                stats = await service.run_full_discovery(
                    max_categories=5,
                    max_hashtags_per_category=2,
                    max_users_per_hashtag=20,
                )
                logger.info(f"Daily discovery complete: {stats}")

            except Exception as e:
                logger.error(f"Daily discovery failed: {e}")

    async def run_weekly_update(self):
        """Run weekly update of stale data"""
        logger.info("Starting weekly update")

        async with async_session_maker() as session:
            service = InfluencerDiscoveryService(session)

            try:
                updated = await service.update_stale_influencers(
                    max_age_days=7,
                    limit=500,
                )
                logger.info(f"Weekly update complete: {updated} updated")

            except Exception as e:
                logger.error(f"Weekly update failed: {e}")

    async def run_now(
        self,
        task_type: str = "discovery",
        **kwargs,
    ) -> dict:
        """
        Run a task immediately (for manual triggers).

        Args:
            task_type: "discovery" or "update"
            **kwargs: Additional parameters

        Returns:
            Task result statistics
        """
        async with async_session_maker() as session:
            service = InfluencerDiscoveryService(session)

            if task_type == "discovery":
                return await service.run_full_discovery(**kwargs)
            elif task_type == "update":
                updated = await service.update_stale_influencers(**kwargs)
                return {"updated_count": updated}
            elif task_type == "category":
                category = kwargs.get("category", "beauty")
                new, updated = await service.discover_category(category)
                return {"new": new, "updated": updated}
            else:
                raise ValueError(f"Unknown task type: {task_type}")


# Celery tasks (for production use)
# These would be defined in app/tasks/crawler_tasks.py

"""
from celery import Celery
from app.crawler.scheduler import CrawlerScheduler

celery = Celery('tagbuy')

@celery.task
def daily_discovery_task():
    import asyncio
    scheduler = CrawlerScheduler()
    asyncio.run(scheduler.run_daily_discovery())

@celery.task
def weekly_update_task():
    import asyncio
    scheduler = CrawlerScheduler()
    asyncio.run(scheduler.run_weekly_update())

@celery.task
def discover_category_task(category: str):
    import asyncio
    scheduler = CrawlerScheduler()
    asyncio.run(scheduler.run_now("category", category=category))

# Celery Beat schedule
celery.conf.beat_schedule = {
    'daily-discovery': {
        'task': 'tasks.daily_discovery_task',
        'schedule': crontab(hour=3, minute=0),
    },
    'weekly-update': {
        'task': 'tasks.weekly_update_task',
        'schedule': crontab(hour=4, minute=0, day_of_week='sunday'),
    },
}
"""
