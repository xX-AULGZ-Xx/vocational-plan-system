import { redirect } from 'next/navigation';

export default async function RootPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const isLogout = searchParams?.logout === '1';
  redirect(isLogout ? '/dashboard?logout=1' : '/dashboard');
}
