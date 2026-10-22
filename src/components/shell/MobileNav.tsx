import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

export function MobileNav() {
  const language = usePreferencesStore((state) => state.language);
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={translate(language, "shell.toggleNavigation")}
          className="md:hidden"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" closeLabel={translate(language, "common.close")}>
        <SheetHeader>
          <SheetTitle>Hyeria</SheetTitle>
          <SheetDescription>{translate(language, "app.tagline")}</SheetDescription>
        </SheetHeader>
        <Sidebar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
