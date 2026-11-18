"""S3-compatible object storage abstraction."""
import os
from pathlib import Path
from abc import ABC, abstractmethod
from typing import Optional


class Storage(ABC):
    """Abstract storage interface."""

    @abstractmethod
    def put(self, key: str, data: bytes) -> None:
        """Write data to storage."""
        pass

    @abstractmethod
    def get(self, key: str) -> bytes:
        """Read data from storage."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if key exists."""
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete key from storage."""
        pass

    @abstractmethod
    def size(self, key: str) -> int:
        """Get size of object."""
        pass


class LocalStorage(Storage):
    """File system storage."""

    def __init__(self, root: str):
        self.root = Path(root).resolve()

    def _safe_path(self, key: str) -> Path:
        """Validate and get full path."""
        if not key or "/" in key.split("/")[0][:1] or ".." in key.split("/"):
            raise ValueError(f"Unsafe storage key: {key}")
        p = (self.root / key).resolve()
        if not str(p).startswith(str(self.root) + os.sep):
            raise ValueError(f"Unsafe storage key: {key}")
        return p

    def put(self, key: str, data: bytes) -> None:
        p = self._safe_path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get(self, key: str) -> bytes:
        return self._safe_path(key).read_bytes()

    def exists(self, key: str) -> bool:
        return self._safe_path(key).exists()

    def delete(self, key: str) -> None:
        p = self._safe_path(key)
        if p.exists():
            p.unlink()

    def size(self, key: str) -> int:
        return self._safe_path(key).stat().st_size


class S3Storage(Storage):
    """AWS S3 / S3-compatible storage."""

    def __init__(self, endpoint: str, bucket: str, access_key: str, secret_key: str):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")

        self.bucket = bucket
        # Support S3-compatible services (MinIO, Wasabi, etc.)
        s3_config = {
            "service_name": "s3",
            "region_name": "auto",
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }
        if endpoint:
            s3_config["endpoint_url"] = endpoint

        self.s3 = boto3.client(**s3_config, config=Config(signature_version='s3v4'))

    def put(self, key: str, data: bytes) -> None:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)

    def get(self, key: str) -> bytes:
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        return response['Body'].read()

    def exists(self, key: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.s3.exceptions.NoSuchKey:
            return False

    def delete(self, key: str) -> None:
        self.s3.delete_object(Bucket=self.bucket, Key=key)

    def size(self, key: str) -> int:
        response = self.s3.head_object(Bucket=self.bucket, Key=key)
        return response['ContentLength']


_instance: Optional[Storage] = None


def get_storage() -> Storage:
    """Get configured storage instance."""
    global _instance
    if _instance:
        return _instance

    driver = os.getenv("STORAGE_DRIVER", "local")

    if driver == "s3":
        endpoint = os.getenv("S3_ENDPOINT", "")
        bucket = os.getenv("S3_BUCKET", "geniussound")
        access_key = os.getenv("S3_ACCESS_KEY_ID", "")
        secret_key = os.getenv("S3_SECRET_ACCESS_KEY", "")

        if not all([access_key, secret_key]):
            raise ValueError("S3 storage requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY")

        _instance = S3Storage(endpoint, bucket, access_key, secret_key)
    else:
        root = os.getenv("STORAGE_LOCAL_ROOT", "./.data/storage")
        _instance = LocalStorage(root)

    return _instance
