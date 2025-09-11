import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { DollarSign, Edit, Trash2, Plus, Percent, Tag } from "lucide-react"

interface PricingRule {
  id: string
  productName: string
  basePrice: number
  discount: number
  finalPrice: number
  taxOption: string
  promotionType: string
  isActive: boolean
}

const mockPricingRules: PricingRule[] = [
  {
    id: "1",
    productName: "Laptop Computer",
    basePrice: 999.99,
    discount: 10,
    finalPrice: 899.99,
    taxOption: "standard",
    promotionType: "seasonal",
    isActive: true
  },
  {
    id: "2",
    productName: "Wireless Mouse",
    basePrice: 29.99,
    discount: 5,
    finalPrice: 28.49,
    taxOption: "standard",
    promotionType: "bulk",
    isActive: true
  }
]

export function SalesPriceConfiguration() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(mockPricingRules)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [formData, setFormData] = useState({
    productName: "",
    basePrice: "",
    discount: "",
    taxOption: "standard",
    promotionType: "none"
  })

  const calculateFinalPrice = (basePrice: number, discount: number) => {
    return basePrice - (basePrice * discount / 100)
  }

  const handleSubmit = () => {
    if (!formData.productName || !formData.basePrice) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const basePrice = parseFloat(formData.basePrice)
    const discount = parseFloat(formData.discount) || 0
    const finalPrice = calculateFinalPrice(basePrice, discount)

    const newRule: PricingRule = {
      id: editingRule?.id || Date.now().toString(),
      productName: formData.productName,
      basePrice,
      discount,
      finalPrice,
      taxOption: formData.taxOption,
      promotionType: formData.promotionType,
      isActive: true
    }

    if (editingRule) {
      setPricingRules(rules => rules.map(rule => rule.id === editingRule.id ? newRule : rule))
      toast({ title: "Pricing rule updated successfully" })
    } else {
      setPricingRules(rules => [...rules, newRule])
      toast({ title: "Pricing rule added successfully" })
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      productName: "",
      basePrice: "",
      discount: "",
      taxOption: "standard",
      promotionType: "none"
    })
    setEditingRule(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule)
    setFormData({
      productName: rule.productName,
      basePrice: rule.basePrice.toString(),
      discount: rule.discount.toString(),
      taxOption: rule.taxOption,
      promotionType: rule.promotionType
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setPricingRules(rules => rules.filter(rule => rule.id !== id))
    toast({ title: "Pricing rule deleted" })
  }

  const toggleActive = (id: string) => {
    setPricingRules(rules => rules.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Price Configuration
          </span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRule(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pricing Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRule ? "Edit" : "Add"} Pricing Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price ($)</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.1"
                      value={formData.discount}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxOption">Tax Option</Label>
                    <Select value={formData.taxOption} onValueChange={(value) => setFormData(prev => ({ ...prev, taxOption: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (10%)</SelectItem>
                        <SelectItem value="reduced">Reduced (5%)</SelectItem>
                        <SelectItem value="exempt">Tax Exempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="promotionType">Promotion Type</Label>
                    <Select value={formData.promotionType} onValueChange={(value) => setFormData(prev => ({ ...prev, promotionType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Promotion</SelectItem>
                        <SelectItem value="seasonal">Seasonal Discount</SelectItem>
                        <SelectItem value="bulk">Bulk Pricing</SelectItem>
                        <SelectItem value="clearance">Clearance Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.basePrice && formData.discount && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Final Price: ${calculateFinalPrice(parseFloat(formData.basePrice), parseFloat(formData.discount)).toFixed(2)}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} className="flex-1">
                    {editingRule ? "Update" : "Add"} Rule
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Final Price</TableHead>
              <TableHead>Promotion</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.productName}</TableCell>
                <TableCell>${rule.basePrice.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {rule.discount}%
                  </div>
                </TableCell>
                <TableCell className="font-bold">${rule.finalPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={rule.promotionType === "none" ? "secondary" : "default"}>
                    <Tag className="w-3 h-3 mr-1" />
                    {rule.promotionType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(rule.id)}
                  >
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}