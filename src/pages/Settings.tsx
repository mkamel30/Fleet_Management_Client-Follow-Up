import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateForm } from "@/components/settings/EmailTemplateForm";
import { WhatsAppTemplateForm } from "@/components/settings/WhatsAppTemplateForm";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إعدادات القوالب</h1>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى العملاء
          </Link>
        </Button>
      </header>
      <main>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">قالب البريد الإلكتروني</TabsTrigger>
            <TabsTrigger value="whatsapp">قالب واتساب</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <EmailTemplateForm />
          </TabsContent>
          <TabsContent value="whatsapp">
            <WhatsAppTemplateForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;