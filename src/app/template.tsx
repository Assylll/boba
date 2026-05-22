import NavShell from "@/components/NavShell";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <NavShell>{children}</NavShell>;
}
