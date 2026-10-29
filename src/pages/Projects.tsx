import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { ProjectsTab } from "@/components/projects/ProjectsTab";
import PackagesPage from "@/pages/Packages";

type Section = "projects" | "packages";

/** Underline-style section tabs, visually distinct from the segmented status filter below. */
const SECTION_LIST =
  "h-auto w-full gap-5 rounded-none border-0 border-b border-border bg-transparent p-0";
const SECTION_TRIGGER =
  "h-9 rounded-none border-b-2 border-transparent px-0.5 text-sm -mb-px data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none";

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tab: Section = searchParams.get("tab") === "packages" ? "packages" : "projects";

  const setTab = (value: string) => {
    setSearchParams(value === "packages" ? { tab: value } : {}, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title={t("projects.page_title")}
        description={t("projects.page_description")}
        className="mb-0 border-b-0 pb-3"
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={SECTION_LIST}>
          <TabsTrigger value="projects" className={SECTION_TRIGGER}>{t("projects.tab_projects")}</TabsTrigger>
          <TabsTrigger value="packages" className={SECTION_TRIGGER}>{t("projects.tab_packages")}</TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <PackagesPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
