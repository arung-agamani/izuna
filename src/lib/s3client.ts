import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import logger from "./winston";

let s3: S3Client | undefined = undefined;

const S3_REGION = process.env["S3_REGION"] || "";
const S3_BUCKET = process.env["S3_BUCKET"];
export function getS3Client() {
    if (!s3) {
        s3 = new S3Client({
            region: S3_REGION,
            credentials: {
                accessKeyId: process.env["S3_CLIENT_ID"] || "",
                secretAccessKey: process.env["S3_CLIENT_SECRET"] || "",
            },
        });
        logger.info("S3 Client Initialized");
    }
    return s3;
}

// TODO: Add Delete Object
export async function uploadFile(scopeId: string, attachmentName: string, body: Buffer, mimeType: string) {
    const s3 = getS3Client();
    const objectKey = `${scopeId}_${attachmentName}`;
    const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: objectKey,
        Body: body,
        ContentType: mimeType,
    });

    try {
        const response = await s3.send(putCommand);
        return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${objectKey}`;
    } catch (error) {
        logger.error("Error on uploading file");
        logger.error(error);
        return null;
    }
}
