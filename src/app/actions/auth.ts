'use server';

import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_auth';

export async function loginAdmin(passcode: string) {
  const adminPass = process.env.ADMIN_PASSCODE;
  
  if (!adminPass) {
    throw new Error('Chưa cấu hình mật khẩu quản lý trong hệ thống.');
  }

  if (passcode === adminPass) {
    cookies().set(COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  } else {
    throw new Error('Mã PIN không chính xác!');
  }
}

export async function logoutAdmin(formData?: FormData) {
  cookies().delete(COOKIE_NAME);
}

export async function checkIsAdmin() {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value === 'true';
}
