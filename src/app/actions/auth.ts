'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

const COOKIE_NAME = 'admin_auth';
const MEMBER_COOKIE_NAME = 'member_auth';

export async function loginAdmin(passcode: string) {
  const adminPass = process.env.ADMIN_PASSCODE;
  
  if (!adminPass) {
    return { error: 'Chưa cấu hình mật khẩu quản lý trong hệ thống.' };
  }

  if (passcode === adminPass) {
    cookies().set(COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    return { success: true };
  } else {
    return { error: 'Mật khẩu không chính xác!' };
  }
}

export async function logoutAdmin(formData?: FormData) {
  cookies().delete(COOKIE_NAME);
}

export async function checkIsAdmin() {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value === 'true';
}

export async function loginMember(identifier: string, pinCode: string, remember: boolean = false) {
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .ilike('email', identifier.trim());

  if (error) {
    return { error: 'Lỗi hệ thống: ' + error.message };
  }

  if (!members || members.length === 0) {
    return { error: 'Không tìm thấy tài khoản với Email này!' };
  }

  const member = members.find(m => m.pin_code === pinCode);
  if (!member) {
    return { error: 'Mật khẩu không chính xác!' };
  }

  cookies().set(MEMBER_COOKIE_NAME, member.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
  });

  return { success: true, memberId: member.id };
}

export async function logoutMember() {
  cookies().delete(MEMBER_COOKIE_NAME);
}

export async function getAuthenticatedMemberId() {
  const cookieStore = cookies();
  return cookieStore.get(MEMBER_COOKIE_NAME)?.value || null;
}
