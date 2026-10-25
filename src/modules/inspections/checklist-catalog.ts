export type DemoChecklistItem = {
  key: string;
  label: string;
  source: string;
  required: boolean;
};

const decree96 =
  'https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-96-2016-nd-cp-20633.htm';
const decree58 =
  'https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-58-2026-nd-cp-468975.htm';
const decree56 =
  'https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-56-2023-nd-cp-39902.htm';
const item = (
  key: string,
  label: string,
  clause: string,
  required = true,
  amendment?: { citation: string; sourceUrl: string },
): DemoChecklistItem & { sourceUrl: string } => ({
  key,
  label,
  required,
  source: `NĐ 96/2016/NĐ-CP, Điều ${clause}${amendment ? `; ${amendment.citation}` : ''}`,
  sourceUrl: amendment?.sourceUrl ?? decree96,
});
const common = item(
  'registered',
  'Cơ sở có đăng ký, giấy phép hoặc được thành lập theo pháp luật Việt Nam không?',
  '7 khoản 1',
);
const nd56Art1Clause1 = {
  citation: 'sửa đổi bởi NĐ 56/2023/NĐ-CP, Điều 1 khoản 1',
  sourceUrl: decree56,
};
const nd58Art1Clauses67 = {
  citation: 'sửa đổi/bổ sung bởi NĐ 58/2026/NĐ-CP, Điều 1 khoản 6, khoản 7',
  sourceUrl: decree58,
};
const nd58Art1Clause17 = {
  citation: 'thay thế bởi NĐ 58/2026/NĐ-CP, Điều 1 khoản 17',
  sourceUrl: decree58,
};
const nd58Art1Clause19 = {
  citation: 'cập nhật địa danh bởi NĐ 58/2026/NĐ-CP, Điều 1 khoản 19',
  sourceUrl: decree58,
};

const categories = [
  {
    id: 'seal',
    label: 'Sản xuất con dấu — Đ3 khoản 1',
    items: [
      item(
        'seal-intake',
        'Quy trình tiếp nhận và giá khắc dấu có được niêm yết công khai không?',
        '26 khoản 1',
      ),
      item(
        'seal-handover',
        'Dấu được bảo quản an toàn và gửi cơ quan công an đăng ký thay vì giao trực tiếp cho khách (trừ ngoại lệ dấu doanh nghiệp) không?',
        '26 khoản 3',
      ),
      item(
        'seal-samples',
        'Mẫu dấu cơ quan/tổ chức có được giữ kín với người không có thẩm quyền không?',
        '26 khoản 4',
      ),
    ],
  },
  {
    id: 'pawn',
    label: 'Cầm đồ — Đ3 khoản 4',
    items: [
      item(
        'pawn-authorization',
        'Với tài sản cầm cố của người thứ ba, có văn bản ủy quyền hợp lệ của chủ sở hữu không?',
        '29 khoản 4',
        true,
        nd56Art1Clause1,
      ),
      item(
        'pawn-storage',
        'Có nơi bảo quản tài sản cầm cố và bảo đảm an toàn tài sản khách hàng không?',
        '29 khoản 7',
        true,
        nd56Art1Clause1,
      ),
    ],
  },
  {
    id: 'massage',
    label: 'Xoa bóp — Đ3 khoản 5',
    items: [
      item(
        'massage-belongings',
        'Có nơi an toàn để khách bảo quản đồ dùng không?',
        '30 khoản 1',
      ),
      item(
        'massage-rooms',
        'Có bố trí phòng riêng cho nam và nữ khi thực hiện dịch vụ xoa bóp không?',
        '30 khoản 2',
      ),
    ],
  },
  {
    id: 'security',
    label: 'Dịch vụ bảo vệ — Đ3 khoản 7',
    items: [
      item(
        'security-training-staff',
        'Nhân viên dịch vụ bảo vệ được đào tạo và cấp chứng chỉ nghiệp vụ bảo vệ không?',
        '32 khoản 2; 12 khoản 4-5',
        true,
        nd58Art1Clauses67,
      ),
      item(
        'security-labor',
        'Có hợp đồng lao động với nhân viên dịch vụ bảo vệ không?',
        '32 khoản 3',
      ),
      item(
        'security-uniform',
        'Nhân viên bảo vệ được quản lý được cấp biển hiệu, đồng phục và đăng ký logo áo với công an có thẩm quyền không?',
        '32 khoản 5',
      ),
      item(
        'security-contract',
        'Có ký hợp đồng dịch vụ kinh tế trước khi thực hiện công việc bảo vệ không?',
        '32 khoản 6',
      ),
    ],
  },
  {
    id: 'games',
    label: 'Trò chơi điện tử có thưởng cho người nước ngoài — Đ3 khoản 9',
    items: [
      item(
        'games-house-rules',
        'Nội quy ANTT, phòng chống tệ nạn xã hội và phòng cháy/chữa cháy bằng tiếng Việt và tiếng nước ngoài được niêm yết tại lối vào khu kinh doanh không?',
        '33 khoản 1',
      ),
      item(
        'games-access',
        'Việc tiếp cận được giới hạn theo pháp luật chuyên ngành áp dụng không?',
        '33 khoản 4',
      ),
      item(
        'games-machines',
        'Số lượng, chủng loại máy trò chơi có thưởng và giấy tờ nguồn gốc được báo cáo công an có thẩm quyền không?',
        '33 khoản 3',
      ),
      item(
        'games-security-staff',
        'Ít nhất 30% nhân viên bảo vệ thuộc doanh nghiệp kinh doanh dịch vụ bảo vệ không?',
        '33 khoản 6',
      ),
    ],
  },
  {
    id: 'casino',
    label: 'Casino — Đ3 khoản 11',
    items: [
      item(
        'casino-house-rules',
        'Nội quy ANTT, phòng chống tệ nạn xã hội và phòng cháy/chữa cháy song ngữ được niêm yết tại lối vào khu kinh doanh không?',
        '33 khoản 1',
      ),
      item(
        'casino-access',
        'Việc tiếp cận được giới hạn theo pháp luật casino áp dụng không?',
        '33 khoản 4',
      ),
      item(
        'casino-security-staff',
        'Ít nhất 30% nhân viên bảo vệ thuộc doanh nghiệp kinh doanh dịch vụ bảo vệ không?',
        '33 khoản 6',
      ),
    ],
  },
  {
    id: 'betting',
    label: 'Đặt cược — Đ3 khoản 12',
    items: [
      item(
        'betting-house-rules',
        'Nội quy ANTT được niêm yết ở nơi dễ thấy, dễ đọc không?',
        '35 khoản 1',
      ),
    ],
  },
  {
    id: 'explosive-use',
    label: 'Ngành nghề sử dụng vật liệu nổ công nghiệp — Đ3 khoản 16',
    items: [
      item(
        'explosive-use-rules',
        'Nội quy ANTT/phòng cháy nổ được niêm yết rõ ràng tại nơi cất giữ hoặc sử dụng vật liệu nổ công nghiệp không?',
        '38 khoản 1',
      ),
      item(
        'explosive-provider',
        'Nếu thuê dịch vụ nổ mìn, nhà cung cấp có giấy chứng nhận ANTT và giấy phép dịch vụ nổ mìn theo quy định không?',
        '38 khoản 3',
      ),
    ],
  },
  {
    id: 'blasting',
    label: 'Dịch vụ nổ mìn — Đ3 khoản 17',
    items: [
      item(
        'blasting-rules',
        'Nội quy ANTT/phòng cháy nổ được niêm yết rõ ràng tại nơi cất giữ hoặc sử dụng vật liệu nổ không?',
        '38 khoản 1',
      ),
      item(
        'blasting-notice',
        'Có thông báo bằng văn bản cho công an cấp xã tại nơi nổ mìn ít nhất sáu ngày trước khi nổ mìn không?',
        '38 khoản 4',
        true,
        nd58Art1Clause17,
      ),
    ],
  },
  {
    id: 'karaoke',
    label: 'Karaoke — Đ3 khoản 21(a)',
    items: [
      item(
        'karaoke-house-rules',
        'Nội quy ANTT, phòng chống tệ nạn xã hội và an toàn phòng cháy được niêm yết ở nơi dễ thấy, dễ đọc không?',
        '42 khoản 1',
      ),
    ],
  },
  {
    id: 'dance',
    label: 'Vũ trường — Đ3 khoản 21(b)',
    items: [
      item(
        'dance-house-rules',
        'Nội quy ANTT, phòng chống tệ nạn xã hội và an toàn phòng cháy được niêm yết ở nơi dễ thấy, dễ đọc không?',
        '43 khoản 1',
      ),
      item(
        'dance-security-staff',
        'Ít nhất 30% nhân viên bảo vệ thuộc doanh nghiệp kinh doanh dịch vụ bảo vệ không?',
        '43 khoản 2',
      ),
    ],
  },
] as const;

const art8Ids = [
  'games',
  'casino',
  'betting',
  'explosive-use',
  'blasting',
  'dance',
] as const;
const securityVariants = ['không FDI', 'FDI'] as const;
export const INSPECTION_CATEGORIES = categories.map(({ id, label }) => ({
  id,
  label,
}));
export const ARTICLE_8_CATEGORY_IDS = art8Ids;
export const SECURITY_CHECKLIST_CAVEAT =
  'Dịch vụ bảo vệ (k.7): chỉ hiển thị một phần câu hỏi dùng chung. Điều 11 và Điều 32 khoản 9 của NĐ 96 về nội dung riêng cho doanh nghiệp FDI đang được giữ lại/loại trừ khỏi mẫu này. Không tải lên CivicOS hồ sơ gửi cơ quan có thẩm quyền.';
export const SECURITY_VARIANTS = securityVariants.flatMap((investment) => [
  {
    value: `${categories[3].label} — ${investment}`,
    label: `${investment}, không có chức năng đào tạo`,
    training: false,
  },
  {
    value: `${categories[3].label} — ${investment} — đào tạo`,
    label: `${investment}, có chức năng đào tạo`,
    training: true,
  },
]);

export function checklistForType(
  type: string,
): (DemoChecklistItem & { sourceUrl?: string })[] | null {
  const category = categories.find(
    ({ label }) => type === label || type.startsWith(`${label} —`),
  );
  if (!category) return null;
  const items: (DemoChecklistItem & { sourceUrl?: string })[] = [
    common,
    ...category.items,
  ];
  if (art8Ids.includes(category.id as (typeof art8Ids)[number])) {
    items.push(
      item(
        'security-plan',
        'Có phương án bảo đảm ANTT gồm các nội dung cơ bản: khu vực/mục tiêu, biện pháp, nhân sự thường xuyên, phương tiện, tổ chức/chỉ huy, phối hợp và tình huống/ứng phó không?',
        '8 khoản 1 điểm d, đ, e, i, k, l; khoản 2 điểm a-g',
      ),
    );
  }
  if (category.id === 'security') {
    if (type.includes('đào tạo'))
      items.push(
        item(
          'security-training-function',
          'Hoạt động đào tạo chỉ diễn ra sau khi chương trình được cơ quan công an có thẩm quyền xem xét; có văn bản đề nghị sát hạch, cấp chứng chỉ cho người đạt với thời hạn năm năm; lý thuyết trực tiếp/trực tuyến và thực hành trực tiếp không?',
          '32 khoản 4; 12 khoản 4-5',
          true,
          nd58Art1Clauses67,
        ),
      );
    items.push(
      item(
        'security-cross-province',
        'Nếu mục tiêu bảo vệ ngoài tỉnh/thành nơi doanh nghiệp đặt trụ sở: đã gửi thông báo trong năm ngày theo quy định chưa?',
        '32 khoản 8',
        false,
        nd58Art1Clause19,
      ),
    );
  }
  return items;
}
