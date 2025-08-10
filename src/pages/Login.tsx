import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
                confirmation_text: 'تفقد بريدك الإلكتروني لتأكيد الحساب',
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