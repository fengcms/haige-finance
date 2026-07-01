# 忘记登录密码时的重置说明

本系统是单用户本地桌面软件，登录密码保存在本地 SQLite 数据库的 `app_meta` 表中。

密码不会明文保存，而是保存为：

```text
auth_password_hash
auth_password_salt
auth_password_set_at
```

如果忘记登录密码，软件内不会提供免验证重置入口，因为那会削弱登录保护。

## 推荐方案：恢复数据库备份

如果你有设置密码前或记得密码时的数据库备份，推荐使用备份恢复。

流程：

1. 打开应用。
2. 如果无法登录，先联系开发人员协助。
3. 使用备份文件恢复数据库。
4. 登录后进入“系统设置 → 安全设置”重新修改密码。

## 技术重置方案

如果确认要清除登录密码，可以在关闭软件后，删除 `app_meta` 中的认证字段。

注意：操作前请先复制当前数据库文件做备份。

需要删除的 key：

```text
auth_password_hash
auth_password_salt
auth_password_set_at
```

删除后再次启动软件，会进入首次设置密码页面。

## 风险提示

1. 不要在软件运行时直接修改数据库文件。
2. 重置前必须备份数据库。
3. 不要删除其他 `app_meta` 字段。
4. 如果不熟悉 SQLite 操作，请交给开发人员处理。

## 开发人员参考 SQL

在确认数据库已备份、软件已关闭后，可执行：

```sql
DELETE FROM app_meta
WHERE key IN (
  'auth_password_hash',
  'auth_password_salt',
  'auth_password_set_at'
);
```

重新打开软件后，系统会要求设置新的本地管理员密码。
