import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  // All session and redirect logic is now handled by the SessionProvider.
  // This component is now much simpler.

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">تسجيل الدخول</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'البريد الإلكتروني',
                password_label: 'كلمة المرور',
                email_input_placeholder: 'your.email@example.com',
                password_input_placeholder: 'كلمة المرور الخاصة بك',
                button_label: 'تسجيل الدخول',
                social_provider_text: 'تسجيل الدخول باستخدام',
                link_text: 'هل لديك حساب بالفعل؟ سجل الدخول',
              },
              sign_up: {
                email_label: 'البريد الإلكتروني',
                password_label: 'كلمة المرور',
                email_input_placeholder: 'your.email@example.com',
                password_input_placeholder: 'كلمة المرور الخاصة بك',
                button_label: 'إنشاء حساب',
                social_provider_text: 'إنشاء حساب باستخدام',
                link_text: 'ليس لديك حساب؟ أنشئ حسابًا',
                confirmation_text: 'تفقد بريدك الإلكتروني لتأكيد الحساب. بعد تسجيل الدخول، يرجى تحديث اسمك الكامل في صفحة الملف الشخصي.',
              },
              forgotten_password: {
                email_label: 'البريد الإلكتروني',
                password_label: 'كلمة المرور',
                email_input_placeholder: 'your.email@example.com',
                button_label: 'إرسال تعليمات إعادة التعيين',
                link_text: 'هل نسيت كلمة المرور؟',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;