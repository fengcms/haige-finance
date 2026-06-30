import { Card, Typography } from 'antd';

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <Card>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {description ?? '第一阶段占位页面，后续将在此补充业务功能。'}
      </Typography.Paragraph>
    </Card>
  );
}
