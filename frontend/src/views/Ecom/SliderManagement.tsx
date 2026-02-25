"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  Upload,
  ArrowUpDown
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ecomApiService, EcommerceSlider, CreateSliderRequest, UpdateSliderRequest } from "@/services/ecom-api";

export default function SliderManagement() {
  const [sliders, setSliders] = useState<EcommerceSlider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<EcommerceSlider | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<CreateSliderRequest>({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    try {
      setLoading(true);
      const data = await ecomApiService.getAllSliders();
      setSliders(data);
    } catch (error) {
      console.error("Error fetching sliders:", error);
      toast.error("Failed to load sliders");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (slider?: EcommerceSlider) => {
    if (slider) {
      setEditingSlider(slider);
      setFormData({
        title: slider.title,
        description: slider.description || "",
        image_url: slider.image_url,
        link_url: slider.link_url || "",
        order_index: slider.order_index,
        is_active: slider.is_active,
      });
    } else {
      setEditingSlider(null);
      setFormData({
        title: "",
        description: "",
        image_url: "",
        link_url: "",
        order_index: sliders.length,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSlider(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { imageUrl } = await ecomApiService.uploadSliderImage(file);
      setFormData({ ...formData, image_url: imageUrl });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image_url) {
      toast.error("Title and Image are required");
      return;
    }

    try {
      setSaving(true);
      if (editingSlider) {
        await ecomApiService.updateSlider(editingSlider.id, formData as UpdateSliderRequest);
        toast.success("Slider updated successfully");
      } else {
        await ecomApiService.createSlider(formData);
        toast.success("Slider created successfully");
      }
      handleCloseDialog();
      fetchSliders();
    } catch (error) {
      console.error("Error saving slider:", error);
      toast.error("Failed to save slider");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlider = async (id: string) => {
    if (!confirm("Are you sure you want to delete this slider?")) return;

    try {
      await ecomApiService.deleteSlider(id);
      toast.success("Slider deleted successfully");
      fetchSliders();
    } catch (error) {
      console.error("Error deleting slider:", error);
      toast.error("Failed to delete slider");
    }
  };

  const toggleStatus = async (slider: EcommerceSlider) => {
    try {
      await ecomApiService.updateSlider(slider.id, { is_active: !slider.is_active });
      toast.success(`Slider ${!slider.is_active ? 'activated' : 'deactivated'}`);
      fetchSliders();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredSliders = sliders.filter(slider => 
    slider.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (slider.description && slider.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getFullImageUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:9000";
    return `${baseUrl}${url}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-commerce Sliders</h1>
          <p className="text-muted-foreground">Manage homepage carousel sliders for your e-commerce site.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Slider
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search sliders..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading sliders...</p>
            </div>
          ) : filteredSliders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="bg-muted p-4 rounded-full">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No sliders found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No results for "${searchQuery}"` : "Get started by creating your first slider."}
                </p>
              </div>
              <Button variant="outline" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Slider
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Title & Description</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSliders.map((slider) => (
                    <TableRow key={slider.id}>
                      <TableCell className="font-medium">{slider.order_index}</TableCell>
                      <TableCell>
                        <div className="w-16 h-10 rounded overflow-hidden border bg-muted flex items-center justify-center">
                          {slider.image_url ? (
                            <img 
                              src={getFullImageUrl(slider.image_url)} 
                              alt={slider.title} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{slider.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{slider.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {slider.link_url ? (
                          <a 
                            href={slider.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {slider.link_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No link</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={slider.is_active} 
                            onCheckedChange={() => toggleStatus(slider)}
                          />
                          <Badge variant={slider.is_active ? "default" : "secondary"}>
                            {slider.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenDialog(slider)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteSlider(slider.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSlider ? "Edit Slider" : "Add Slider"}</DialogTitle>
              <DialogDescription>
                Configure the slider image and details for the ecommerce homepage.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Welcome to our store"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the slider"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>Slider Image *</Label>
                <div className="flex flex-col gap-3">
                  <div className="relative group w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                    {formData.image_url ? (
                      <>
                        <img 
                          src={getFullImageUrl(formData.image_url)} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm">
                              <Upload className="h-6 w-6 text-white" />
                            </div>
                          </label>
                        </div>
                      </>
                    ) : (
                      <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? "Uploading..." : "Click to upload image"}
                        </span>
                      </label>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </div>
                  {formData.image_url && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="text-xs font-mono"
                        placeholder="/uploads/..."
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-8 w-8"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="link_url">Link URL</Label>
                  <Input
                    id="link_url"
                    placeholder="/shop/new-arrivals"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active slider</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingSlider ? "Update Slider" : "Create Slider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
