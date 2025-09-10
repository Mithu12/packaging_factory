import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, FolderPlus, Tag, Loader2 } from "lucide-react"
import { ApiService, Category, Subcategory, CreateCategoryRequest, CreateSubcategoryRequest, UpdateCategoryRequest, UpdateSubcategoryRequest, ApiError } from "@/services/api"

// Remove duplicate types since we're importing from API service

// Validation schemas
const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
})

const subcategorySchema = z.object({
  name: z.string().min(2, "Subcategory name must be at least 2 characters"),
  description: z.string().optional(),
  category_id: z.number().min(1, "Please select a category"),
})

type CategoryForm = z.infer<typeof categorySchema>
type SubcategoryForm = z.infer<typeof subcategorySchema>

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<{ subcategory: Subcategory; categoryId: number } | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Helper function to refresh subcategories data
  const refreshSubcategories = async () => {
    const subcategoriesResult = await ApiService.getSubcategories({ limit: 1000 })
    const subcategories = subcategoriesResult.subcategories
    
    // Group subcategories by category_id
    const subcategoriesByCategory = subcategories.reduce((acc, subcategory) => {
      if (!acc[subcategory.category_id]) {
        acc[subcategory.category_id] = []
      }
      acc[subcategory.category_id].push(subcategory)
      return acc
    }, {} as Record<number, Subcategory[]>)
    
    // Update categories with the latest subcategories
    setCategories(categories.map(category => ({
      ...category,
      subcategories: subcategoriesByCategory[category.id] || []
    })))
  }

  // Category form
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  })

  // Subcategory form
  const subcategoryForm = useForm<SubcategoryForm>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: { name: "", description: "", category_id: 0 },
  })

  // Fetch categories and subcategories on component mount
  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch categories
        const categoriesResult = await ApiService.getCategories({ limit: 100 })
        const categories = categoriesResult.categories
        
        // Fetch all subcategories
        const subcategoriesResult = await ApiService.getSubcategories({ limit: 1000 })
        const subcategories = subcategoriesResult.subcategories
        
        // Group subcategories by category_id
        const subcategoriesByCategory = subcategories.reduce((acc, subcategory) => {
          if (!acc[subcategory.category_id]) {
            acc[subcategory.category_id] = []
          }
          acc[subcategory.category_id].push(subcategory)
          return acc
        }, {} as Record<number, Subcategory[]>)
        
        // Attach subcategories to their parent categories
        const categoriesWithSubcategories = categories.map(category => ({
          ...category,
          subcategories: subcategoriesByCategory[category.id] || []
        }))
        
        setCategories(categoriesWithSubcategories)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive"
          })
        } else {
          setError("Failed to load categories")
          toast({
            title: "Error",
            description: "Failed to load categories",
            variant: "destructive"
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCategoriesAndSubcategories()
  }, [])

  // Category handlers
  const onAddCategory = async (data: CategoryForm) => {
    try {
      setSaving(true)
      const newCategory = await ApiService.createCategory({
        name: data.name,
        description: data.description
      })
      setCategories([...categories, newCategory])
      categoryForm.reset()
      setIsAddCategoryOpen(false)
      toast({ 
        title: "Category added successfully!",
        description: `${newCategory.name} has been created.`
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add category",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const onEditCategory = async (data: CategoryForm) => {
    if (!editingCategory) return
    
    try {
      setSaving(true)
      const updatedCategory = await ApiService.updateCategory(editingCategory.id, data)
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? updatedCategory : cat
      ))
      categoryForm.reset()
      setEditingCategory(null)
      toast({ 
        title: "Category updated successfully!",
        description: `${updatedCategory.name} has been updated.`
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update category",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const onDeleteCategory = async (categoryId: number) => {
    try {
      setSaving(true)
      await ApiService.deleteCategory(categoryId)
      setCategories(categories.filter(cat => cat.id !== categoryId))
      toast({ 
        title: "Category deleted successfully!",
        description: "Category and all its subcategories have been removed."
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  // Subcategory handlers
  const onAddSubcategory = async (data: SubcategoryForm) => {
    try {
      setSaving(true)
      const newSubcategory = await ApiService.createSubcategory({
        name: data.name,
        description: data.description,
        category_id: data.category_id
      })
      
      // Refresh subcategories data from the database
      await refreshSubcategories()
      
      subcategoryForm.reset()
      setIsAddSubcategoryOpen(false)
      toast({ 
        title: "Subcategory added successfully!",
        description: `${newSubcategory.name} has been created.`
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add subcategory",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const onEditSubcategory = async (data: SubcategoryForm) => {
    if (!editingSubcategory) return
    
    try {
      setSaving(true)
      const updatedSubcategory = await ApiService.updateSubcategory(editingSubcategory.subcategory.id, data)
      
      // Refresh subcategories data from the database
      await refreshSubcategories()
      
      subcategoryForm.reset()
      setEditingSubcategory(null)
      toast({ 
        title: "Subcategory updated successfully!",
        description: `${updatedSubcategory.name} has been updated.`
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update subcategory",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const onDeleteSubcategory = async (categoryId: number, subcategoryId: number) => {
    try {
      setSaving(true)
      await ApiService.deleteSubcategory(subcategoryId)
      
      // Refresh subcategories data from the database
      await refreshSubcategories()
      
      toast({ 
        title: "Subcategory deleted successfully!",
        description: "Subcategory has been removed."
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete subcategory",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.setValue("name", category.name)
    categoryForm.setValue("description", category.description || "")
  }

  const startEditSubcategory = (subcategory: Subcategory, categoryId: number) => {
    setEditingSubcategory({ subcategory, categoryId })
    subcategoryForm.setValue("name", subcategory.name)
    subcategoryForm.setValue("description", subcategory.description || "")
    subcategoryForm.setValue("category_id", categoryId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading categories...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Categories Management</h1>
          <p className="text-muted-foreground">Manage your product categories and subcategories</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Create a new product category</DialogDescription>
              </DialogHeader>
              <Form {...categoryForm}>
                <form onSubmit={categoryForm.handleSubmit(onAddCategory)} className="space-y-4">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter category name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter category description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Category'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSubcategoryOpen} onOpenChange={setIsAddSubcategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subcategory</DialogTitle>
                <DialogDescription>Create a new subcategory under an existing category</DialogDescription>
              </DialogHeader>
              <Form {...subcategoryForm}>
                <form onSubmit={subcategoryForm.handleSubmit(onAddSubcategory)} className="space-y-4">
                  <FormField
                    control={subcategoryForm.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Category</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subcategoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter subcategory name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subcategoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter subcategory description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddSubcategoryOpen(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Subcategory'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {categories.map(category => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5" />
                    {category.name}
                    <Badge variant="secondary">{category.subcategories?.length || 0} subcategories</Badge>
                  </CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditCategory(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {category.subcategories && category.subcategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.subcategories.map(subcategory => (
                    <div
                      key={subcategory.id}
                      className="p-3 border rounded-lg bg-muted/50 flex justify-between items-start"
                    >
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {subcategory.name}
                        </h4>
                        {subcategory.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {subcategory.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditSubcategory(subcategory, category.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteSubcategory(category.id, subcategory.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No subcategories yet. Add one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onEditCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Category'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Dialog */}
      <Dialog open={!!editingSubcategory} onOpenChange={() => setEditingSubcategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>Update subcategory information</DialogDescription>
          </DialogHeader>
          <Form {...subcategoryForm}>
            <form onSubmit={subcategoryForm.handleSubmit(onEditSubcategory)} className="space-y-4">
              <FormField
                control={subcategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subcategoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingSubcategory(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Subcategory'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Categories