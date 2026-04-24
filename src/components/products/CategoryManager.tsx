'use client'

import { useState, useEffect, useCallback } from 'react'
import { ecommerceApi } from '@/lib/api'
import { unwrapEcommerceList } from '@/lib/ecommerce-list'
import { Category } from '@/lib/types'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface CategoryManagerProps {
  onClose: () => void
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ecommerceApi.categories.listForAdmin()
      setCategories(unwrapEcommerceList<Category>(data))
    } catch (error) {
      console.error('Error fetching categories:', error)
      showError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    try {
      setIsAdding(true)
      await ecommerceApi.categories.create({ name: newCategoryName })
      setNewCategoryName('')
      showSuccess('Category added successfully')
      fetchCategories()
    } catch (error: any) {
      console.error('Error adding category:', error)
      let errorMessage = 'Failed to add category'
      if (error?.details?.error?.message) {
        errorMessage = error.details.error.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      showError(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteCategory = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteCategoryConfirm = async () => {
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    if (!id) return
    try {
      await ecommerceApi.categories.delete(id)
      showSuccess('Category deleted successfully')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      showError('Failed to delete category')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold font-playfair text-text">Manage Categories</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleAddCategory} className="mb-8">
            <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light mb-2 block">
              Add New Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="form-input flex-1 py-2 px-3 bg-gray-50 border-gray-200 focus:bg-white focus:ring-vintage-primary/10"
                disabled={isAdding}
              />
              <button
                type="submit"
                disabled={isAdding || !newCategoryName.trim()}
                className="btn btn-primary px-4 py-2 disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light mb-2 block">
              Existing Categories
            </label>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-vintage-primary opacity-50" />
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-vintage-primary/20 transition-all">
                    <span className="font-medium text-text">{category.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-text-muted hover:text-vintage-accent transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-text-muted italic">No categories found.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
          <button onClick={onClose} className="btn btn-secondary px-6">
            Close
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete category"
        message="Are you sure you want to delete this category?"
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteCategoryConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}
