import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "@/lib/env";
import { DOWNLOAD_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS } from "@/lib/constants";

let client: S3Client | null = null;

function getClient() {
  if (client) return client;
  const config = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

function bucket() {
  return getR2Config().bucket;
}

export async function createUploadUrl(objectKey: string, contentType: string) {
  const url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
  return url;
}

export async function createDownloadUrl(objectKey: string) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

export async function objectExists(objectKey: string) {
  try {
    await getClient().send(
      new HeadObjectCommand({
        Bucket: bucket(),
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteObject(objectKey: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
    }),
  );
}
