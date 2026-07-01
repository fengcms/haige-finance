import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { authApi } from '@/renderer/api/authApi';

interface LoginPageProps {
  passwordSet: boolean;
  onAuthenticated: () => void;
  onPasswordSet: () => void;
}

export function LoginPage({ passwordSet, onAuthenticated, onPasswordSet }: LoginPageProps) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  async function handleSubmit(values: Record<string, string>) {
    try {
      if (passwordSet) {
        await authApi.login({ password: values.password });
        onAuthenticated();
      } else {
        await authApi.setupPassword({
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        messageApi.success('管理员密码已设置');
        onPasswordSet();
        onAuthenticated();
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '操作失败');
    }
  }

  return (
    <div className="login-page">
      {contextHolder}
      <Card className="login-card">
        <div className="login-brand">
          <img className="login-logo" src="./logo.svg" alt="海哥财务管理" />
          <Typography.Title level={3} className="login-title">
            海哥财务管理
          </Typography.Title>
          <Typography.Text type="secondary">
            {passwordSet ? '请输入本地管理员密码' : '首次使用，请设置本地管理员密码'}
          </Typography.Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="用户" name="username" initialValue="admin">
            <Input prefix={<UserOutlined />} disabled />
          </Form.Item>
          <Form.Item name="password" label={passwordSet ? '登录密码' : '设置密码'} rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} autoFocus />
          </Form.Item>
          {!passwordSet ? (
            <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请再次输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
          ) : null}
          <Button type="primary" htmlType="submit" block>
            {passwordSet ? '登录' : '设置密码并进入'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
