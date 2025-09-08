import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">{session?.user?.email}</span>
        <Button variant="outline" onClick={handleLogout}>تسجيل الخروج</Button>
      </div>
      <div className="text-center mb-12">
        <img src="https://wxhinjdceqneufvanfqe.supabase.co/storage/v1/object/public/public-assets/Smart-Logo-Horizontal.jpg" alt="Smart Fuel Logo" className="h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-800">نظام متابعة العملاء</h1>
        <p className="text-gray-600 mt-2">الرجاء اختيار القسم الذي تود إدارته</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link to="/fleet" className="transform hover:scale-105 transition-transform duration-300">
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 hover:shadow-xl transition-shadow">
            <CardHeader>
              <Car className="h-16 w-16 mx-auto text-primary mb-4" />
              <CardTitle className="text-2xl font-semibold">إدارة عملاء الأسطول</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">متابعة وإدارة عملاء خدمات الوقود للشركات.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/pos" className="transform hover:scale-105 transition-transform duration-300">
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 hover:shadow-xl transition-shadow">
            <CardHeader>
              <ShoppingCart className="h-16 w-16 mx-auto text-primary mb-4" />
              <CardTitle className="text-2xl font-semibold">إدارة مبيعات نقاط البيع</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">متابعة وإدارة العملاء المحتملين لنقاط البيع.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Landing;