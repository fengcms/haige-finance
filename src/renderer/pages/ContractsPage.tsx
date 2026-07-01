import { EditOutlined, EyeOutlined, FileImageOutlined, FilePdfOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Drawer, Image, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { contractAttachmentApi } from '@/renderer/api/contractAttachmentApi';
import {
  contractApi,
  customerApi,
  projectApi,
  type ContractListItem,
  type Customer,
  type ProjectListItem,
} from '@/renderer/api/masterDataApi';
import { useDictionaries } from '@/renderer/hooks/useDictionaries';
import { contractStatusLabels } from '@/renderer/utils/labels';
import { formatYuan, parseYuan } from '@/renderer/utils/money';
import type { ContractAttachment, ContractAttachmentPreview } from '@/shared/types/contractAttachment';

interface RenameState {
  attachment: ContractAttachment;
  value: string;
}

export function ContractsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentContract, setCurrentContract] = useState<ContractListItem | null>(null);
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ContractAttachmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const dictionaries = useDictionaries(['contract_status']);
  const statusLabels = dictionaries.labels('contract_status', contractStatusLabels);

  useEffect(() => {
    void Promise.all([customerApi.list({ page: 1, pageSize: 100 }), projectApi.list({ page: 1, pageSize: 100 })]).then(([customerResult, projectResult]) => {
      setCustomers(customerResult.items);
      setProjects(projectResult.items);
    });
  }, []);

  async function openAttachments(contract: ContractListItem) {
    setCurrentContract(contract);
    setDrawerOpen(true);
    await loadAttachments(contract.id);
  }

  async function loadAttachments(contractId = currentContract?.id) {
    if (!contractId) {
      return;
    }

    try {
      setLoading(true);
      const nextAttachments = await contractAttachmentApi.list(contractId);
      setAttachments(nextAttachments);
      void loadImageThumbnails(nextAttachments);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '附件加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!currentContract) {
      return;
    }

    try {
      setLoading(true);
      await contractAttachmentApi.importFiles(currentContract.id);
      await loadAttachments(currentContract.id);
      messageApi.success('附件已导入');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePdf() {
    if (!currentContract) {
      return;
    }

    try {
      setLoading(true);
      const result = await contractAttachmentApi.generatePdf(currentContract.id);
      await loadAttachments(currentContract.id);
      messageApi.success(`已生成 PDF，共 ${result.pageCount} 页`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '生成 PDF 失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen(attachment: ContractAttachment) {
    if (!attachment.fileExists) {
      messageApi.warning('本地文件不存在，无法打开');
      return;
    }

    try {
      await contractAttachmentApi.openFile(attachment.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '打开失败');
    }
  }

  async function handlePreview(attachment: ContractAttachment) {
    if (!attachment.fileExists) {
      messageApi.warning('本地文件不存在，无法预览');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreview(await contractAttachmentApi.preview(attachment.id));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRename() {
    if (!renameState || !currentContract) {
      return;
    }

    try {
      setLoading(true);
      await contractAttachmentApi.rename(renameState.attachment.id, renameState.value);
      setRenameState(null);
      await loadAttachments(currentContract.id);
      messageApi.success('附件名称已更新');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '重命名失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(attachment: ContractAttachment) {
    if (!currentContract) {
      return;
    }

    try {
      await contractAttachmentApi.remove(attachment.id);
      await loadAttachments(currentContract.id);
      messageApi.success('附件已删除');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '删除失败');
    }
  }

  async function moveAttachment(index: number, direction: -1 | 1) {
    if (!currentContract) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= attachments.length) {
      return;
    }

    const next = [...attachments];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

    try {
      setAttachments(next);
      setAttachments(await contractAttachmentApi.reorder(currentContract.id, next.map((item) => item.id)));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '排序保存失败');
      await loadAttachments(currentContract.id);
    }
  }

  async function loadImageThumbnails(nextAttachments: ContractAttachment[]) {
    const imageAttachments = nextAttachments.filter((item) => item.fileType === 'image' && item.fileExists);
    const entries = await Promise.all(
      imageAttachments.map(async (attachment) => {
        try {
          const previewResult = await contractAttachmentApi.preview(attachment.id);
          return [attachment.id, previewResult.dataUrl] as const;
        } catch {
          return null;
        }
      }),
    );

    setThumbnailMap(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
  }

  return (
    <>
      {contextHolder}
      <MasterDataPage<ContractListItem>
        title="合同"
        api={contractApi}
        columns={[
          { title: '合同名称', dataIndex: 'name', width: 200 },
          { title: '合同编号', dataIndex: 'contractNo', width: 150 },
          { title: '客户', dataIndex: 'customerName', width: 150 },
          { title: '项目', dataIndex: 'projectName', width: 200 },
          {
            title: '合同金额',
            dataIndex: 'amountCents',
            width: 130,
            render: (value) => `${formatYuan(Number(value))} 元`,
          },
          { title: '签约日期', dataIndex: 'signedDate', width: 120 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (value) => <Tag>{statusLabels[String(value)] ?? value}</Tag>,
          },
        ]}
        rowActions={(record) => (
          <Button type="text" icon={<FolderOpenOutlined />} onClick={() => openAttachments(record)}>
            附件
          </Button>
        )}
        fields={[
          {
            name: 'customerId',
            label: '所属客户',
            required: true,
            render: <Select showSearch optionFilterProp="label" options={customers.map((customer) => ({ value: customer.id, label: customer.name }))} />,
          },
          {
            name: 'projectId',
            label: '所属项目',
            required: true,
            render: <Select showSearch optionFilterProp="label" options={projects.map((project) => ({ value: project.id, label: `${project.name}${project.customerName ? `（${project.customerName}）` : ''}` }))} />,
          },
          { name: 'name', label: '合同名称', required: true, render: <Input /> },
          { name: 'contractNo', label: '合同编号', render: <Input /> },
          { name: 'amountYuan', label: '合同金额（元）', required: true, render: <Input /> },
          { name: 'signedDate', label: '签约日期', render: <Input placeholder="YYYY-MM-DD" /> },
          { name: 'status', label: '合同状态', required: true, render: <Select options={dictionaries.options('contract_status', contractStatusLabels)} /> },
          { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
        ]}
        normalizeBeforeEdit={(item) => ({
          ...item,
          amountYuan: formatYuan(item.amountCents),
        })}
        normalizeBeforeSubmit={(values) => {
          const { amountYuan, ...rest } = values;
          return {
            status: 'draft',
            ...rest,
            amountCents: parseYuan(amountYuan as string),
          };
        }}
      />

      <Drawer
        title={currentContract ? `合同附件：${currentContract.name}` : '合同附件'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={`calc(100vw - 200px)`}
      >
        <Space direction="vertical" size="middle" className="page-stack">
          <Space wrap>
            <Button type="primary" icon={<UploadOutlined />} loading={loading} onClick={handleImport}>
              上传图片/PDF
            </Button>
            <Button icon={<FilePdfOutlined />} loading={loading} onClick={handleGeneratePdf}>
              图片生成 PDF
            </Button>
            <Button onClick={() => loadAttachments()} loading={loading}>
              刷新
            </Button>
          </Space>

          <Table<ContractAttachment>
            rowKey="id"
            loading={loading}
            dataSource={attachments}
            columns={attachmentColumns({
              handleOpen,
              handlePreview,
              handleRemove,
              moveAttachment,
              setRenameState,
              thumbnailMap,
              total: attachments.length,
            })}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Drawer>

      <Modal
        title={preview?.originalName ?? '附件预览'}
        open={Boolean(preview) || previewLoading}
        footer={null}
        width={preview?.fileType === 'pdf' ? 900 : 720}
        onCancel={() => setPreview(null)}
        destroyOnClose
      >
        {previewLoading ? (
          <Typography.Text type="secondary">正在加载预览...</Typography.Text>
        ) : preview?.fileType === 'image' ? (
          <Image src={preview.dataUrl} alt={preview.originalName} width="100%" />
        ) : preview ? (
          <iframe title={preview.originalName} src={preview.dataUrl} style={{ width: '100%', height: '72vh', border: 0 }} />
        ) : null}
      </Modal>

      <Modal
        title="重命名附件"
        open={Boolean(renameState)}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
        onOk={handleRename}
        onCancel={() => setRenameState(null)}
      >
        <Input
          value={renameState?.value ?? ''}
          maxLength={200}
          showCount
          onChange={(event) =>
            setRenameState((current) => (current ? { ...current, value: event.target.value } : current))
          }
        />
      </Modal>
    </>
  );
}

function attachmentColumns(actions: {
  handleOpen: (attachment: ContractAttachment) => void;
  handlePreview: (attachment: ContractAttachment) => void;
  handleRemove: (attachment: ContractAttachment) => void;
  moveAttachment: (index: number, direction: -1 | 1) => void;
  setRenameState: (state: RenameState) => void;
  thumbnailMap: Record<string, string>;
  total: number;
}): ColumnsType<ContractAttachment> {
  return [
    {
      title: '预览',
      key: 'preview',
      width: 90,
      render: (_, record) =>
        record.fileType === 'image' && actions.thumbnailMap[record.id] ? (
          <Image src={actions.thumbnailMap[record.id]} alt={record.originalName} width={48} height={48} style={{ objectFit: 'cover' }} preview={false} />
        ) : record.fileType === 'image' ? (
          <FileImageOutlined style={{ fontSize: 24 }} />
        ) : (
          <FilePdfOutlined style={{ fontSize: 24 }} />
        ),
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      width: 90,
      render: (value, record) => <Tag color={record.sourceType === 'generated' ? 'purple' : undefined}>{value === 'image' ? '图片' : 'PDF'}</Tag>,
    },
    {
      title: '文件名',
      dataIndex: 'originalName',
      width: 260,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{value}</Typography.Text>
          {!record.fileExists ? <Typography.Text type="danger">本地文件丢失</Typography.Text> : null}
        </Space>
      ),
    },
    { title: '来源', dataIndex: 'sourceType', width: 90, render: (value) => (value === 'generated' ? '生成' : '上传') },
    { title: '大小', dataIndex: 'fileSizeBytes', width: 100, render: (value) => formatFileSize(value) },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (value) => dayjs(Number(value)).format('YYYY-MM-DD HH:mm') },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '操作',
      key: 'actions',
      width: 360,
      render: (_, record, index) => (
        <Space>
          <Button type="link" onClick={() => actions.moveAttachment(index, -1)} disabled={index === 0}>
            上移
          </Button>
          <Button type="link" onClick={() => actions.moveAttachment(index, 1)} disabled={index === actions.total - 1}>
            下移
          </Button>
          <Button type="link" icon={<EyeOutlined />} onClick={() => actions.handlePreview(record)} disabled={!record.fileExists}>
            预览
          </Button>
          <Button type="link" icon={<FolderOpenOutlined />} onClick={() => actions.handleOpen(record)} disabled={!record.fileExists}>
            打开
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => actions.setRenameState({ attachment: record, value: record.originalName })}>
            重命名
          </Button>
          <Popconfirm title="确认删除附件？" okText="删除" cancelText="取消" onConfirm={() => actions.handleRemove(record)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

function formatFileSize(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
