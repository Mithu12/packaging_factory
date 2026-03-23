"use client";

import { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Database, 
  Download, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Loader2,
  AlertTriangle 
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { BackupApi, Backup } from "@/services/backup-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFormatting } from "@/hooks/useFormatting";
export default function BackupPage() {
  const { formatDate } = useFormatting()
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data = await BackupApi.listBackups();
      setBackups(data);
    } catch (error) {
      console.error("Failed to fetch backups:", error);
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await BackupApi.createBackup();
      toast.success("Backup created successfully");
      fetchBackups();
    } catch (error) {
      console.error("Failed to create backup:", error);
      toast.error("Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      setRestoring(filename);
      await BackupApi.restoreBackup(filename);
      toast.success("Database restored successfully", {
        description: "The system has been restored to the selected state."
      });
      // Force reload to ensure data consistency
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Failed to restore backup:", error);
      toast.error("Failed to restore database");
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      setDeleting(filename);
      await BackupApi.deleteBackup(filename);
      toast.success("Backup deleted successfully");
      fetchBackups();
    } catch (error) {
      console.error("Failed to delete backup:", error);
      toast.error("Failed to delete backup");
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Backup</h1>
          <p className="text-muted-foreground italic">
            Manage your system backups. You can create, download, and restore database states.
          </p>
        </div>
        <Button 
          type="button"
          variant="add"
          onClick={handleCreateBackup} 
          disabled={creating || loading}
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create New Backup
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle>Available Backups</CardTitle>
          </div>
          <CardDescription>
            A list of all database backups stored on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
              <p className="text-muted-foreground animate-pulse text-sm font-medium">Fetching backup history...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
              <Database className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground italic">No backups found</h3>
              <p className="text-sm text-muted-foreground mt-1 italic">
                Get started by creating your first database backup.
              </p>
              <Button 
                variant="outline" 
                onClick={handleCreateBackup} 
                className="mt-4 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                Create Backup Now
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden bg-background/30">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider py-4">Filename</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider py-4">Date & Time</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider py-4">Size</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.filename} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm border-b border-border/10 py-4">{backup.filename}</TableCell>
                      <TableCell className="text-sm text-muted-foreground border-b border-border/10 py-4">
                        {formatDate(backup.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground border-b border-border/10 py-4">
                        {formatSize(backup.size)}
                      </TableCell>
                      <TableCell className="text-right border-b border-border/10 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => BackupApi.downloadBackup(backup.filename)}
                            title="Download Backup"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={restoring === backup.filename}
                                title="Restore from this backup"
                                className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                              >
                                {restoring === backup.filename ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-background border-border shadow-2xl">
                              <AlertDialogHeader>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                                  </div>
                                  <AlertDialogTitle className="text-xl">Restore Database?</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription className="text-muted-foreground">
                                  This action will <span className="text-amber-500 font-bold">OVERWRITE</span> your current database with the contents of <span className="font-mono text-foreground font-semibold">"{backup.filename}"</span>. 
                                  Any changes made since this backup was created will be <span className="text-destructive font-bold">PERMANENTLY LOST</span>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRestore(backup.filename)}
                                  className="bg-amber-500 hover:bg-amber-600 border-none text-white shadow-lg"
                                >
                                  Continue with Restore
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(backup.filename)}
                            disabled={deleting === backup.filename}
                            title="Delete Backup"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            {deleting === backup.filename ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-4 max-w-2xl mx-auto backdrop-blur-sm">
        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
        <div className="space-y-1">
          <h4 className="font-semibold text-amber-600 text-sm">Security & Safety Warning</h4>
          <p className="text-xs text-amber-700/80 leading-relaxed italic">
            Always download a copy of your backup to an external storage. Database restoration is a critical process that clears current data. Use with extreme caution and only when necessary.
          </p>
        </div>
      </div>
    </div>
  );
}
