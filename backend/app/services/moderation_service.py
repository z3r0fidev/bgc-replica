from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.community import ContentReport, ForumThread, ForumPost, StatusUpdate

class ModerationService:
    REPORT_THRESHOLD = 5

    async def report_content(self, db: AsyncSession, reporter_id: uuid.UUID, content_type: str, content_id: uuid.UUID, reason: str):
        """
        Create a report and check if threshold is met.
        """
        new_report = ContentReport(
            reporter_id=reporter_id,
            content_type=content_type,
            content_id=content_id,
            reason=reason
        )
        db.add(new_report)
        
        # Increment report_count on the target model
        model_map = {
            "THREAD": ForumThread,
            "POST": ForumPost,
            "STATUS": StatusUpdate
        }
        
        if content_type in model_map:
            model = model_map[content_type]
            stmt = select(model).where(model.id == content_id)
            result = await db.execute(stmt)
            target = result.scalars().first()
            if target:
                target.report_count += 1
                if target.report_count >= self.REPORT_THRESHOLD:
                    # Logic for "Auto-flag for high priority" would go here
                    print(f"Content {content_id} reached report threshold.")

        await db.commit()
        return new_report

moderation_service = ModerationService()
