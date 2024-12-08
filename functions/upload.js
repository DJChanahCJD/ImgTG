import { errorHandling, telemetryData } from "./utils/middleware";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        console.log('Upload file size:', uploadFile.size);

        // 对于大文件，先获取文件链接
        if (uploadFile.size > 20 * 1024 * 1024) { // 20MB
            const telegramFormData = new FormData();
            telegramFormData.append("chat_id", env.TG_Chat_ID);
            telegramFormData.append("document", uploadFile);

            console.log('Uploading large file to Telegram...');

            const response = await fetch(
                `https://api.telegram.org/bot${env.TG_Bot_Token}/sendDocument`,
                {
                    method: "POST",
                    body: telegramFormData
                }
            );

            const responseData = await response.json();
            console.log('Telegram response:', responseData);

            if (!response.ok) {
                throw new Error(responseData.description || 'Upload failed');
            }

            // 获取文件链接
            const fileId = responseData.result.document.file_id;
            const fileLink = await fetch(
                `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`
            ).then(res => res.json());

            console.log('File link:', fileLink);

            return new Response(
                JSON.stringify([{
                    'src': `/file/${fileId}.${uploadFile.name.split('.').pop()}`,
                    'telegram_path': fileLink.result.file_path,
                    'size': uploadFile.size
                }]),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        await errorHandling(context);
        telemetryData(context);

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);

        // 根据文件类型选择合适的上传方式
        let apiEndpoint;
        if (uploadFile.type.startsWith('image/')) {
            telegramFormData.append("photo", uploadFile);
            apiEndpoint = 'sendPhoto';
        } else if (uploadFile.type.startsWith('audio/')) {
            telegramFormData.append("audio", uploadFile);
            apiEndpoint = 'sendAudio';
        } else {
            telegramFormData.append("document", uploadFile);
            apiEndpoint = 'sendDocument';
        }

        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
        console.log('Sending request to:', apiUrl);

        const response = await fetch(
            apiUrl,
            {
                method: "POST",
                body: telegramFormData
            }
        );

        console.log('Response status:', response.status);

        const responseData = await response.json();

        console.log('Response data:', responseData);

        if (!response.ok) {
            console.error('Error response from Telegram API:', responseData);
            throw new Error(responseData.description || 'Upload to Telegram failed');
        }

        const fileId = getFileId(responseData);

        if (!fileId) {
            throw new Error('Failed to get file ID');
        }

        return new Response(
            JSON.stringify([{ 'src': `/file/${fileId}.${fileExtension}` }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}
