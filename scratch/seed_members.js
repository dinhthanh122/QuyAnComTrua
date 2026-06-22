import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const dem = ['Văn', 'Thị', 'Minh', 'Đức', 'Hoàng', 'Ngọc', 'Quốc', 'Tuấn', 'Hải', 'Thanh', 'Bảo', 'Gia', 'Hồng', 'Mai', 'Xuân'];
const ten = ['Anh', 'Bình', 'Cường', 'Dũng', 'Dương', 'Đạt', 'Giang', 'Hải', 'Hiếu', 'Hòa', 'Huy', 'Hùng', 'Hương', 'Khang', 'Khánh', 'Khoa', 'Kiên', 'Lâm', 'Linh', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Ngọc', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tài', 'Tâm', 'Thắng', 'Thành', 'Thảo', 'Thiện', 'Thịnh', 'Thu', 'Trang', 'Trí', 'Trung', 'Tuấn', 'Tùng', 'Vinh', 'Vũ'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVietnameseName() {
  return `${getRandomElement(ho)} ${getRandomElement(dem)} ${getRandomElement(ten)}`;
}

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

async function seed() {
  console.log('Generating 40 members...');
  const members = [];
  
  for (let i = 0; i < 40; i++) {
    const fullName = generateVietnameseName();
    const emailPrefix = removeAccents(fullName).toLowerCase().replace(/ /g, '.');
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const email = `${emailPrefix}${randomNum}@example.com`;
    
    members.push({
      name: fullName,
      email: email,
      balance: 0
    });
  }

  const { data, error } = await supabase
    .from('members')
    .insert(members);

  if (error) {
    console.error('Error inserting members:', error);
  } else {
    console.log('Successfully inserted 40 members!');
  }
}

seed();
