import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
import { Product } from "@/services/types"

interface ProductSearchProps {
  products: Product[]
  onAddToCart: (product: Product) => void
}

export function ProductSearch({ products, onAddToCart }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Product Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, barcode, or category..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.current_stock <= 0;
            return (
              <div 
                key={product.id} 
                className={`border rounded-lg p-3 transition-shadow ${
                  isOutOfStock 
                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                    : 'bg-white border cursor-pointer hover:shadow-md'
                }`} 
                onClick={() => !isOutOfStock && onAddToCart(product)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={product.current_stock > 10 ? "default" : product.current_stock > 0 ? "secondary" : "destructive"} className="text-xs px-1 py-0">
                        QTY: {product.current_stock}
                      </Badge>
                      {isOutOfStock && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          OUT OF STOCK
                        </Badge>
                      )}
                    </div>
                    <h4 className={`font-medium text-sm mb-1 ${isOutOfStock ? 'text-gray-500' : ''}`}>{product.name}</h4>
                    <p className={`text-xs mb-1 ${isOutOfStock ? 'text-gray-400' : 'text-muted-foreground'}`}>Price: R{product.selling_price}</p>
                    <p className={`text-xs ${isOutOfStock ? 'text-gray-400' : 'text-muted-foreground'}`}>SKU: {product.sku || 'N/A'}</p>
                  </div>
                  <div className={`w-12 h-12 rounded flex items-center justify-center ${
                    isOutOfStock ? 'bg-gray-100' : 'bg-gray-100'
                  }`}>
                    <div className={`w-8 h-8 rounded ${
                      isOutOfStock ? 'bg-gray-200' : 'bg-gray-200'
                    }`}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
}