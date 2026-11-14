import type { MeetingTypeId } from "@/lib/types";
import { getRole } from "@/data/roles";

export interface Preset {
  id: string;
  name: string;
  description: string;
  topic: string;
  meetingTypeId: MeetingTypeId;
  /** First valid role is appointed facilitator. */
  roleIds: string[];
  facilitatorRoleId?: string;
}

const RAW: Preset[] = [
  {
    id: "education",
    name: "教育改革",
    description: "生徒・教師・親・教育委員会・文科大臣",
    topic: "高校の部活動の地域移行",
    meetingTypeId: "council",
    facilitatorRoleId: "university_professor",
    roleIds: ["jhs_student", "hs_student", "teacher", "parent", "school_principal", "board_of_education_official", "mext_minister", "university_professor"],
  },
  {
    id: "transport",
    name: "地方交通の維持",
    description: "運転手・高齢者・町長・バス会社・学生",
    topic: "ライドシェアの全面解禁",
    meetingTypeId: "town_meeting",
    facilitatorRoleId: "mayor",
    roleIds: ["bus_driver", "elderly_resident", "mayor", "taxi_driver", "bus_company_executive", "hs_student", "mlit_official"],
  },
  {
    id: "ai_work",
    name: "AIと雇用",
    description: "エンジニア・経営者・労働組合・学生・経産省",
    topic: "生成AIの職場での利用ルール",
    meetingTypeId: "roundtable",
    facilitatorRoleId: "university_professor",
    roleIds: ["software_engineer", "company_ceo", "labor_union_leader", "office_worker", "meti_official", "university_student", "university_professor"],
  },
  {
    id: "healthcare",
    name: "地域医療",
    description: "医師・看護師・患者・自治体・厚労省",
    topic: "地域の中核病院の統廃合",
    meetingTypeId: "study_group",
    facilitatorRoleId: "mayor",
    roleIds: ["doctor", "nurse", "patient_family", "mayor", "mhlw_official", "care_worker", "elderly_resident"],
  },
  {
    id: "agri",
    name: "農業と食料",
    description: "農家・消費者・JA・流通・環境NPO",
    topic: "農業の担い手不足と食料安全保障",
    meetingTypeId: "hearing",
    facilitatorRoleId: "university_professor",
    roleIds: ["farmer", "consumer", "jaf_staff", "supermarket_manager", "environment_ngo", "maff_official", "university_professor"],
  },
];

/** Presets resolved against the role catalog: unknown role ids are dropped; presets with <2 valid roles are hidden. */
export function resolvePresets(): (Preset & { roleIds: string[] })[] {
  return RAW.map((p) => ({ ...p, roleIds: p.roleIds.filter((id) => !!getRole(id)) })).filter((p) => p.roleIds.length >= 2);
}
