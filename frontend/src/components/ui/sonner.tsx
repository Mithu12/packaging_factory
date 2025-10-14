import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      richColors
      expand
      duration={6000}
      className="toaster group"
      toastOptions={{
        duration: 6000,
        closeButton: true,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground group-[.toaster]:border-primary/40 group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-sm",
          title: "group-[.toast]:text-base font-semibold",
          description: "group-[.toast]:text-sm text-muted-foreground",
          icon: "group-[.toast]:text-primary",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
