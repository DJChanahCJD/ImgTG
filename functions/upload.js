import { errorHandling, telemetryData } from "./utils/middleware";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        console.log('Upload file size:', uploadFile.size);

        // 对于大文件，使用 sendDocument
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
            console.log('Telegram response:', response);
            const responseData = await response.json();
            console.log('Telegram upload response:', responseData);

            if (!response.ok || !responseData.ok) {
                throw new Error(responseData.description || 'Upload failed');
            }

            // 获取文件ID和原始文件名
            const fileId = responseData.result?.document?.file_id;
            const fileName = uploadFile.name;
            const mimeType = uploadFile.type;

            if (!fileId) {
                throw new Error('Failed to get file ID from Telegram');
            }

            // 尝试最多3次获取文件信息
            let filePath = null;
            let attempts = 3;

            while (attempts > 0 && !filePath) {
                try {
                    // 等待一段时间再尝试获取文件信息
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const fileInfoResponse = await fetch(
                        `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`,
                        {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json'
                            }
                        }
                    );

                    const fileInfo = await fileInfoResponse.json();
                    console.log('File info response:', fileInfo);

                    if (fileInfoResponse.ok && fileInfo.ok && fileInfo.result?.file_path) {
                        filePath = fileInfo.result.file_path;
                        // 构建完整的下载链接
                        const downloadUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
                        break;
                    }
                } catch (error) {
                    console.error('Get file info attempt failed:', error);
                }
                attempts--;
                await new Promise(resolve => setTimeout(resolve, 1000)); // 失败后等待1秒再重试
            }

            // 返回响应时包含完整信息
            return new Response(
                JSON.stringify([{
                    'src': `/file/${fileId}.${fileName.split('.').pop()}`,
                    'file_id': fileId,
                    'telegram_path': filePath,
                    'download_url': filePath ? `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}` : null,
                    'fileInfoResponse': fileInfoResponse,
                    'name': fileName,
                    'mime_type': mimeType,
                    'size': uploadFile.size,
                    'pending': !filePath,
                    'result': responseData
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
            JSON.stringify({
                error: error.message,
                stack: error.stack,
                detail: '文件上传到 Telegram 成功，但获取文件信息失败'
            }),
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
