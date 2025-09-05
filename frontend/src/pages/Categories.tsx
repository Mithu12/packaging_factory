import { useState } from "react"
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
import { Plus, Edit, Trash2, FolderPlus, Tag } from "lucide-react"

// Types
interface Subcategory {
  id: string
  name: string
  description?: string
}

interface Category {
  id: string
  name: string
  description?: string
  subcategories: Subcategory[]
}

// Validation schemas
const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
})

const subcategorySchema = z.object({
  name: z.string().min(2, "Subcategory name must be at least 2 characters"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Please select a category"),
})

type CategoryForm = z.infer<typeof categorySchema>
type SubcategoryForm = z.infer<typeof subcategorySchema>

const Categories = () => {
  // Sample data - in a real app this would come from an API
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "1",
      name: "Electronics",
      description: "Electronic devices and accessories",
      subcategories: [
        { id: "1-1", name: "Smartphones", description: "Mobile phones and accessories" },
        { id: "1-2", name: "Laptops", description: "Portable computers" },
      ]
    },
    {
      id: "2",
      name: "Clothing",
      description: "Apparel and fashion items",
      subcategories: [
        { id: "2-1", name: "Men's Wear" },
        { id: "2-2", name: "Women's Wear" },
      ]
    }
  ])

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<{ subcategory: Subcategory; categoryId: string } | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false)

  // Category form
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  })

  // Subcategory form
  const subcategoryForm = useForm<SubcategoryForm>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: { name: "", description: "", categoryId: "" },
  })

  // Category handlers
  const onAddCategory = (data: CategoryForm) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      subcategories: []
    }
    setCategories([...categories, newCategory])
    categoryForm.reset()
    setIsAddCategoryOpen(false)
    toast({ title: "Category added successfully!" })
  }

  const onEditCategory = (data: CategoryForm) => {
    if (!editingCategory) return
    
    setCategories(categories.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: data.name, description: data.description }
        : cat
    ))
    categoryForm.reset()
    setEditingCategory(null)
    toast({ title: "Category updated successfully!" })
  }

  const onDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId))
    toast({ title: "Category deleted successfully!" })
  }

  // Subcategory handlers
  const onAddSubcategory = (data: SubcategoryForm) => {
    const newSubcategory: Subcategory = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
    }
    
    setCategories(categories.map(cat => 
      cat.id === data.categoryId 
        ? { ...cat, subcategories: [...cat.subcategories, newSubcategory] }
        : cat
    ))
    subcategoryForm.reset()
    setIsAddSubcategoryOpen(false)
    toast({ title: "Subcategory added successfully!" })
  }

  const onEditSubcategory = (data: SubcategoryForm) => {
    if (!editingSubcategory) return
    
    setCategories(categories.map(cat => 
      cat.id === editingSubcategory.categoryId
        ? {
            ...cat,
            subcategories: cat.subcategories.map(sub =>
              sub.id === editingSubcategory.subcategory.id
                ? { ...sub, name: data.name, description: data.description }
                : sub
            )
          }
        : cat
    ))
    subcategoryForm.reset()
    setEditingSubcategory(null)
    toast({ title: "Subcategory updated successfully!" })
  }

  const onDeleteSubcategory = (categoryId: string, subcategoryId: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId
        ? { ...cat, subcategories: cat.subcategories.filter(sub => sub.id !== subcategoryId) }
        : cat
    ))
    toast({ title: "Subcategory deleted successfully!" })
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.setValue("name", category.name)
    categoryForm.setValue("description", category.description || "")
  }

  const startEditSubcategory = (subcategory: Subcategory, categoryId: string) => {
    setEditingSubcategory({ subcategory, categoryId })
    subcategoryForm.setValue("name", subcategory.name)
    subcategoryForm.setValue("description", subcategory.description || "")
    subcategoryForm.setValue("categoryId", categoryId)
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
                    <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Category</Button>
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
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
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
                    <Button type="button" variant="outline" onClick={() => setIsAddSubcategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Subcategory</Button>
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
                    <Badge variant="secondary">{category.subcategories.length} subcategories</Badge>
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
              {category.subcategories.length > 0 ? (
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
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Category</Button>
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
                <Button type="button" variant="outline" onClick={() => setEditingSubcategory(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Subcategory</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Categories