'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  settings: Record<string, string>;
  collegeLogoUrl: string;
  collegeName: string;
  collegeNameEn: string;
  collegeAddress: string;
  collegePhone: string;
  collegeEmail: string;
  collegeWebsite: string;
  directorName: string;
  directorPosition: string;
  currentFiscalYear: string;
  isSubmissionOpen: boolean;
  submissionStartDate: string;
  submissionEndDate: string;
  enableTestMode: boolean;
  googleClientId: string;
  googleAllowedDomains: string;
  memoHeader: string;
  memoOrg: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  themePreset: string;
  themePrimaryColor: string;
  themePrimaryHover: string;
  themeAccentColor: string;
  themeFontFamily: string;
  themeSidebarStyle: string;
  themeBorderRadius: string;
  developerInfo: string;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const defaultContext: SettingsContextType = {
  settings: {},
  collegeLogoUrl: '',
  collegeName: 'วิทยาลัยการอาชีพเชียงราย',
  collegeNameEn: 'Chiangrai Industrial And Community Education College',
  collegeAddress: 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐',
  collegePhone: '053-774505',
  collegeEmail: 'cic.chiangrai@vec.mail.go.th',
  collegeWebsite: 'www.cic.ac.th',
  directorName: 'นางปิยะพร พูลเพิ่ม',
  directorPosition: 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย',
  currentFiscalYear: '2569',
  isSubmissionOpen: true,
  submissionStartDate: '',
  submissionEndDate: '',
  enableTestMode: false,
  googleClientId: '',
  googleAllowedDomains: 'cric.ac.th, vec.mail.go.th',
  memoHeader: 'บันทึกข้อความ',
  memoOrg: 'ส่วนราชการ: วิทยาลัยการอาชีพเชียงราย',
  marginTop: '2.5',
  marginBottom: '2.0',
  marginLeft: '2.5',
  marginRight: '1.5',
  themePreset: 'royal_blue',
  themePrimaryColor: '#1e3a8a',
  themePrimaryHover: '#172554',
  themeAccentColor: '#0d9488',
  themeFontFamily: 'Prompt',
  themeSidebarStyle: 'dark',
  themeBorderRadius: 'md',
  developerInfo: 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ',
  refreshSettings: async () => {},
  isLoading: true,
};

const SettingsContext = createContext<SettingsContextType>(defaultContext);

// Utility to apply theme variables to document
const applyThemeCss = (primary: string, primaryHover: string, accent: string, font: string, radius: string) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (primary) {
    root.style.setProperty('--color-primary', primary);
  }
  if (primaryHover) {
    root.style.setProperty('--color-primary-hover', primaryHover);
  }
  if (accent) {
    root.style.setProperty('--color-accent', accent);
  }

  // Radius map
  const radiusMap: Record<string, string> = {
    sm: '6px',
    md: '10px',
    lg: '16px',
    full: '9999px',
  };
  root.style.setProperty('--app-radius', radiusMap[radius] || '10px');

  // Font Family Map
  const fontMap: Record<string, string> = {
    Prompt: "'Prompt', sans-serif",
    Sarabun: "'Sarabun', 'TH SarabunIT๙', sans-serif",
    Kanit: "'Kanit', sans-serif",
    Mitr: "'Mitr', sans-serif",
    'Noto Sans Thai': "'Noto Sans Thai', sans-serif",
    'Chakra Petch': "'Chakra Petch', sans-serif",
    'Bai Jamjuree': "'Bai Jamjuree', sans-serif",
    K2D: "'K2D', sans-serif",
  };
  if (font && fontMap[font]) {
    root.style.setProperty('--font-ui-family', fontMap[font]);
  }
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        try {
          localStorage.setItem('app_system_settings', JSON.stringify(data.data));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Failed to fetch system settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load cache on client mount
    try {
      const cached = localStorage.getItem('app_system_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings(parsed);
        applyThemeCss(
          parsed.theme_primary_color || '#1e3a8a',
          parsed.theme_primary_hover || '#172554',
          parsed.theme_accent_color || '#0d9488',
          parsed.theme_font_family || 'Prompt',
          parsed.theme_border_radius || 'md'
        );
      }
    } catch (e) {}

    fetchSettings();
  }, []);

  const collegeLogoUrl = settings.college_logo_url || '';
  const collegeName = settings.college_name || 'วิทยาลัยการอาชีพเชียงราย';
  const collegeNameEn = settings.college_name_en || 'Chiangrai Industrial And Community Education College';
  const collegeAddress = settings.college_address || 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐';
  const collegePhone = settings.college_phone || '053-774505';
  const collegeEmail = settings.college_email || 'cic.chiangrai@vec.mail.go.th';
  const collegeWebsite = settings.college_website || 'www.cic.ac.th';
  const directorName = settings.director_name || 'นางปิยะพร พูลเพิ่ม';
  const directorPosition = settings.director_position || `ผู้อำนวยการ${collegeName}`;
  const currentFiscalYear = settings.current_fiscal_year || '2569';
  const isSubmissionOpen = settings.is_submission_open !== 'false';
  const submissionStartDate = settings.submission_start_date || '';
  const submissionEndDate = settings.submission_end_date || '';
  const enableTestMode = settings.enable_test_mode !== 'false';
  const googleClientId = settings.google_client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleAllowedDomains = settings.google_allowed_domains || 'cric.ac.th, vec.mail.go.th';
  const memoHeader = settings.memo_header || 'บันทึกข้อความ';
  const memoOrg = settings.memo_org || `ส่วนราชการ: ${collegeName}`;
  const marginTop = settings.margin_top || '2.5';
  const marginBottom = settings.margin_bottom || '2.0';
  const marginLeft = settings.margin_left || '2.5';
  const marginRight = settings.margin_right || '1.5';

  // Theme settings
  const themePreset = settings.theme_preset || 'royal_blue';
  const themePrimaryColor = settings.theme_primary_color || '#1e3a8a';
  const themePrimaryHover = settings.theme_primary_hover || '#172554';
  const themeAccentColor = settings.theme_accent_color || '#0d9488';
  const themeFontFamily = settings.theme_font_family || 'Prompt';
  const themeSidebarStyle = settings.theme_sidebar_style || 'dark';
  const themeBorderRadius = settings.theme_border_radius || 'md';
  const developerInfo = settings.developer_info || 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ';

  useEffect(() => {
    applyThemeCss(themePrimaryColor, themePrimaryHover, themeAccentColor, themeFontFamily, themeBorderRadius);
  }, [themePrimaryColor, themePrimaryHover, themeAccentColor, themeFontFamily, themeBorderRadius]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        collegeLogoUrl,
        collegeName,
        collegeNameEn,
        collegeAddress,
        collegePhone,
        collegeEmail,
        collegeWebsite,
        directorName,
        directorPosition,
        currentFiscalYear,
        isSubmissionOpen,
        submissionStartDate,
        submissionEndDate,
        enableTestMode,
        googleClientId,
        googleAllowedDomains,
        memoHeader,
        memoOrg,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        themePreset,
        themePrimaryColor,
        themePrimaryHover,
        themeAccentColor,
        themeFontFamily,
        themeSidebarStyle,
        themeBorderRadius,
        developerInfo,
        refreshSettings: fetchSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

