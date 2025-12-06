"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { AuthApi, type User as AuthUser, type UpdateProfileRequest } from "@/services/auth-api"
import { ApiError } from "@/services/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  AlertCircle,
  AtSign,
  Calendar,
  Clock,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/

const trimmedOptionalString = (schema: z.ZodString) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim()
        return trimmed.length === 0 ? undefined : trimmed
      }
      return value
    },
    schema.optional()
  )

const profileSchema = z
  .object({
    full_name: trimmedOptionalString(
      z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name must not exceed 100 characters")
    ),
    email: trimmedOptionalString(z.string().email("Please enter a valid email address")),
    mobile_number: z.string().trim().optional(),
    departments: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasFullName = data.full_name !== undefined
    const hasEmail = data.email !== undefined
    const hasMobile = data.mobile_number !== undefined
    const hasDepartments = data.departments !== undefined

    if (!hasFullName && !hasEmail && !hasMobile && !hasDepartments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
        path: ["full_name"],
      })
    }
  })

const changePasswordSchema = z
  .object({
    current_password: z.string().trim().min(1, "Current password is required"),
    new_password: z
      .string()
      .trim()
      .min(8, "New password must be at least 8 characters")
      .regex(
        passwordComplexityRegex,
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      ),
    confirm_password: z.string().trim().min(8, "Confirm your new password"),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type ProfileFormValues = z.infer<typeof profileSchema>
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Skeleton className="h-64" />
      <Skeleton className="h-64 md:col-span-2" />
    </div>
    <Skeleton className="h-48" />
  </div>
)

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
}) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-1 h-4 w-4 text-muted-foreground" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  </div>
)

const formatDate = (value?: string | Date | null) => {
  if (!value) return "Not available"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "Not available"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "Not available"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "Not available"
  return date.toLocaleString()
}

const toTitleCase = (value?: string | null) => {
  if (!value) return "Not set"
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const getInitials = (fullName?: string | null, username?: string | null) => {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    const first = parts[0]?.[0] ?? ""
    const last = parts[parts.length - 1]?.[0] ?? ""
    return `${first}${last}`.toUpperCase()
  }
  if (username) {
    return username.slice(0, 2).toUpperCase()
  }
  return "US"
}

const Profile = () => {
  const { toast } = useToast()
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<AuthUser | null>(user ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!user)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const isEditingRef = useRef(isEditing)

  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      mobile_number: profile?.mobile_number ?? "",
      departments: profile?.departments?.join(", ") ?? "",
    },
  })

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  const syncFormWithProfile = useCallback(
    (data: AuthUser) => {
      profileForm.reset({
        full_name: data.full_name ?? "",
        email: data.email ?? "",
        mobile_number: data.mobile_number ?? "",
        departments: Array.isArray(data.departments) ? data.departments.join(", ") : "",
      })
    },
    [profileForm]
  )

  useEffect(() => {
    if (user) {
      setProfile((previous) => previous ?? user)
      if (!isEditingRef.current) {
        syncFormWithProfile(user)
      }
    }
  }, [user, syncFormWithProfile])

  const reloadProfile = useCallback(
    async (notify = false) => {
      if (!user) return
      try {
        setIsLoading(true)
        setLoadError(null)
        const latestProfile = await AuthApi.getProfile()
        setProfile(latestProfile)
        if (!isEditingRef.current) {
          syncFormWithProfile(latestProfile)
        }
        if (notify) {
          toast({
            title: "Profile refreshed",
            description: "Your profile information is now up to date.",
          })
        }
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Failed to load profile information."
        setLoadError(message)
        toast({
          title: "Unable to load profile",
          description: message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [syncFormWithProfile, toast, user]
  )

  useEffect(() => {
    if (user) {
      void reloadProfile()
    }
  }, [user, reloadProfile])

  useEffect(() => {
    if (!isPasswordDialogOpen) {
      passwordForm.reset()
    }
  }, [isPasswordDialogOpen, passwordForm])

  const handleCancel = () => {
    if (profile) {
      syncFormWithProfile(profile)
    }
    setIsEditing(false)
  }

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true)
      const payload: UpdateProfileRequest = {}

      if (values.full_name !== undefined) {
        payload.full_name = values.full_name
      }

      if (values.email !== undefined) {
        payload.email = values.email
      }

      if (values.mobile_number !== undefined) {
        payload.mobile_number = values.mobile_number
      }

      if (values.departments !== undefined) {
        const parsedDepartments = values.departments
          .split(",")
          .map((dept) => dept.trim())
          .filter(Boolean)

        payload.departments = parsedDepartments.length > 0 ? parsedDepartments : []
      }

      const updatedProfile = await AuthApi.updateProfile(payload)
      setProfile(updatedProfile)
      syncFormWithProfile(updatedProfile)
      setIsEditing(false)
      await refreshUser()

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update profile information."
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordSubmit = async (values: ChangePasswordFormValues) => {
    try {
      setIsPasswordSubmitting(true)
      await AuthApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })

      setIsPasswordDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to change password."
      toast({
        title: "Change password failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  if (!profile && isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <ProfileSkeleton />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and personal information.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => reloadProfile(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh profile</span>
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile load failed</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {profile ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update your profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" alt={profile.full_name ?? profile.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(profile.full_name, profile.username)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" disabled>
                  <User className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Avatar uploads are coming soon.
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Keep your personal details up to date.</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      form="profile-form"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="space-y-4">
                    <InfoRow
                      icon={User}
                      label="Full Name"
                      value={profile.full_name || "Not provided"}
                    />
                    <Separator />
                    <InfoRow
                      icon={AtSign}
                      label="Username"
                      value={profile.username}
                    />
                    <Separator />
                    <InfoRow
                      icon={Mail}
                      label="Email"
                      value={profile.email}
                    />
                    <Separator />
                    <InfoRow
                      icon={Phone}
                      label="Phone"
                      value={profile.mobile_number || "Not provided"}
                    />
                    <Separator />
                    <InfoRow
                      icon={Shield}
                      label="Role"
                      value={toTitleCase(profile.role)}
                    />
                    <Separator />
                    <InfoRow
                      icon={Calendar}
                      label="Member Since"
                      value={formatDate(profile.created_at)}
                    />
                    <Separator />
                    <InfoRow
                      icon={Clock}
                      label="Last Login"
                      value={formatDateTime(profile.last_login)}
                    />
                    {Array.isArray(profile.departments) && profile.departments.length > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <Shield className="mt-1 h-4 w-4 text-muted-foreground" />
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Departments</p>
                            <div className="flex flex-wrap gap-2">
                              {profile.departments.map((department) => (
                                <Badge key={department} variant="outline">
                                  {department}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Form {...profileForm}>
                    <form
                      id="profile-form"
                      onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={profileForm.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input id="username" value={profile.username} disabled />
                          <p className="text-xs text-muted-foreground">
                            Username cannot be changed.
                          </p>
                        </div>
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="mobile_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="departments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departments</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g. Sales, Operations"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Separate departments with commas. Leave blank to clear.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account security and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password regularly to keep it secure.
                  </p>
                </div>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new password to continue.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="current_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter current password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="new_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter new password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirm_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm new password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPasswordDialogOpen(false)}
                            disabled={isPasswordSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isPasswordSubmitting}>
                            {isPasswordSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              "Update Password"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account. (Coming soon)
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No profile data</AlertTitle>
          <AlertDescription>
            We could not load your profile information. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default Profile
