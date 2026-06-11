import type { Enterprise, EmissionData, EmissionStatus, Attachment } from '../types';

export const INDUSTRIES = [
  '化工制造',
  '电子制造',
  '机械加工',
  '食品加工',
  '纺织印染',
  '医药制造',
  '汽车零部件',
  '新能源',
];

const ENTERPRISE_NAMES = [
  '华东化工有限公司',
  '盛达电子科技',
  '恒信机械制造',
  '绿源食品股份',
  '锦绣纺织集团',
  '安康医药科技',
  '宏达汽车零部件',
  '明阳新能源',
  '永泰化工科技',
  '创新电子设备',
];

const SCALES = ['大型', '中型', '小型'];

const CITIES = [
  '上海市浦东新区',
  '江苏省苏州市工业园区',
  '浙江省杭州市滨江区',
  '广东省深圳市南山区',
  '北京市海淀区',
  '江苏省无锡市新区',
  '浙江省宁波市鄞州区',
  '广东省广州市黄埔区',
];

const AUDITORS = ['张审核', '李主管', '王经理', '赵总监'];

const AUDIT_OPINIONS = [
  '数据完整，核算准确，予以通过。',
  '部分数据需要补充，请完善后重新提交。',
  '原始凭证齐全，排放量计算符合规范。',
  '请核对燃料消耗量与发票数据。',
];

const FILE_TYPES = ['pdf', 'xlsx', 'xls', 'doc', 'docx', 'jpg', 'png'];
const FILE_NAMES = [
  '电费发票',
  '天然气账单',
  '蒸汽用量记录',
  '燃料采购凭证',
  '产量统计表',
  '生产报表',
  '能源消耗汇总',
];

function randomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCreditCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 18; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function randomPhone(): string {
  return '1' + randomInt(3, 9) + Array.from({ length: 9 }, () => randomInt(0, 9)).join('');
}

function randomName(): string {
  const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙'];
  const names = ['伟', '芳', '娜', '敏', '静', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明'];
  return randomChoice(surnames) + randomChoice(names) + (Math.random() > 0.5 ? randomChoice(names) : '');
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getLastSixMonths(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

export function generateEnterprises(): Enterprise[] {
  return ENTERPRISE_NAMES.map((name, index) => {
    const createdAt = new Date(2023, randomInt(0, 11), randomInt(1, 28));
    return {
      id: `ENT${String(index + 1).padStart(4, '0')}`,
      name,
      creditCode: randomCreditCode(),
      industry: INDUSTRIES[index % INDUSTRIES.length],
      scale: randomChoice(SCALES),
      contactPerson: randomName(),
      contactPhone: randomPhone(),
      address: randomChoice(CITIES) + randomInt(100, 999) + '号',
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      createdAt: formatDate(createdAt),
    };
  });
}

export function generateEmissionData(enterprises: Enterprise[]): EmissionData[] {
  const periods = getLastSixMonths();
  const statuses: EmissionStatus[] = ['draft', 'pending', 'approved', 'rejected', 'locked'];
  const statusWeights = [0.1, 0.15, 0.5, 0.1, 0.15];

  function pickStatus(): EmissionStatus {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < statuses.length; i++) {
      sum += statusWeights[i];
      if (r < sum) return statuses[i];
    }
    return 'approved';
  }

  const data: EmissionData[] = [];
  let idCounter = 1;

  enterprises.forEach((ent) => {
    periods.forEach((period, periodIdx) => {
      const status = pickStatus();
      const baseMultiplier = 1 + (Math.random() - 0.5) * 0.3;
      const industryBase = {
        '化工制造': { electricity: 500000, gas: 80000, steam: 2000, fuel: 5000, production: 10000 },
        '电子制造': { electricity: 300000, gas: 20000, steam: 500, fuel: 1000, production: 50000 },
        '机械加工': { electricity: 400000, gas: 30000, steam: 800, fuel: 3000, production: 8000 },
        '食品加工': { electricity: 200000, gas: 50000, steam: 1500, fuel: 2000, production: 30000 },
        '纺织印染': { electricity: 350000, gas: 60000, steam: 3000, fuel: 1500, production: 20000 },
        '医药制造': { electricity: 250000, gas: 40000, steam: 1200, fuel: 2500, production: 5000 },
        '汽车零部件': { electricity: 450000, gas: 35000, steam: 1000, fuel: 4000, production: 15000 },
        '新能源': { electricity: 150000, gas: 10000, steam: 300, fuel: 500, production: 100000 },
      };
      const base = industryBase[ent.industry as keyof typeof industryBase] || industryBase['机械加工'];

      const submitDate = new Date();
      submitDate.setDate(submitDate.getDate() - (periods.length - periodIdx) * 30 - randomInt(1, 15));

      const createdAt = new Date(submitDate);
      createdAt.setDate(createdAt.getDate() - randomInt(1, 5));
      const updatedAt = status !== 'draft' ? submitDate : createdAt;

      data.push({
        id: `EMI${String(idCounter++).padStart(6, '0')}`,
        enterpriseId: ent.id,
        period,
        electricity: Math.round(base.electricity * baseMultiplier * (0.8 + Math.random() * 0.4)),
        gas: Math.round(base.gas * baseMultiplier * (0.8 + Math.random() * 0.4)),
        steam: Math.round(base.steam * baseMultiplier * (0.8 + Math.random() * 0.4)),
        fuel: Math.round(base.fuel * baseMultiplier * (0.8 + Math.random() * 0.4)),
        production: Math.round(base.production * baseMultiplier * (0.8 + Math.random() * 0.4)),
        status,
        submitTime: status !== 'draft' ? formatDate(submitDate) : undefined,
        auditor: (status === 'approved' || status === 'rejected' || status === 'locked') ? randomChoice(AUDITORS) : undefined,
        auditOpinion: (status === 'approved' || status === 'rejected') ? randomChoice(AUDIT_OPINIONS) : undefined,
        createdAt: formatDate(createdAt),
        updatedAt: formatDate(updatedAt),
      });
    });
  });

  return data;
}

export function generateAttachments(emissionData: EmissionData[]): Attachment[] {
  const attachments: Attachment[] = [];
  let idCounter = 1;

  emissionData.forEach((emi) => {
    if (emi.status === 'draft') return;
    const count = randomInt(1, 4);
    for (let i = 0; i < count; i++) {
      const fileType = randomChoice(FILE_TYPES);
      const uploadDate = emi.submitTime ? new Date(emi.submitTime) : new Date();
      uploadDate.setHours(uploadDate.getHours() + randomInt(0, 24));

      attachments.push({
        id: `ATT${String(idCounter++).padStart(6, '0')}`,
        enterpriseId: emi.enterpriseId,
        emissionDataId: emi.id,
        fileName: `${randomChoice(FILE_NAMES)}_${emi.period}.${fileType}`,
        fileType,
        fileSize: randomInt(50 * 1024, 5 * 1024 * 1024),
        uploadTime: formatDate(uploadDate),
        period: emi.period,
      });
    }
  });

  return attachments;
}

const STORAGE_KEY = 'carbon_emission_mock_data';

export function initMockData(): {
  enterprises: Enterprise[];
  emissionData: EmissionData[];
  attachments: Attachment[];
} {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // 解析失败，重新生成
      }
    }
  }

  const enterprises = generateEnterprises();
  const emissionData = generateEmissionData(enterprises);
  const attachments = generateAttachments(emissionData);

  const result = { enterprises, emissionData, attachments };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  return result;
}
