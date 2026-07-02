import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Space, Typography, message } from 'antd';
import type React from 'react';

interface ImagePasteUploadProps {
  disabled?: boolean;
  loading?: boolean;
  onPasteImage: (dataUrl: string, originalName?: string) => Promise<void>;
  onSelectImage: () => Promise<void>;
}

export function ImagePasteUpload({ disabled, loading, onPasteImage, onSelectImage }: ImagePasteUploadProps) {
  const [messageApi, contextHolder] = message.useMessage();

  async function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (disabled || loading) {
      return;
    }

    const imageFile = Array.from(event.clipboardData.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();

    if (!imageFile) {
      messageApi.warning('剪贴板中没有图片');
      return;
    }

    event.preventDefault();
    const dataUrl = await readFileAsDataUrl(imageFile);
    await onPasteImage(dataUrl, imageFile.name || undefined);
  }

  return (
    <div
      className={`image-paste-upload${disabled ? ' image-paste-upload-disabled' : ''}`}
      tabIndex={disabled ? -1 : 0}
      onPaste={handlePaste}
    >
      {contextHolder}
      <Space direction="vertical" size="small" align="center">
        <InboxOutlined className="image-paste-upload-icon" />
        <Typography.Text strong>点击此区域后粘贴截图</Typography.Text>
        <Typography.Text type="secondary">支持 Command + V / Ctrl + V 粘贴 JPG、PNG、WEBP 图片</Typography.Text>
        <Button icon={<UploadOutlined />} loading={loading} disabled={disabled} onClick={onSelectImage}>
          选择图片
        </Button>
      </Space>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取剪贴板图片失败'));
    reader.readAsDataURL(file);
  });
}
