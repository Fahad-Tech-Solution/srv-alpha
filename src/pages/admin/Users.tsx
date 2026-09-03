import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Edit, Trash2, MessageSquare, Plus } from 'lucide-react'
import { formatDate } from '@/utils/format'
import { useAdminUsers, useUpdateUser, useDeleteUser, useAddUserNote, useCreateUser } from '@/hooks/useAdmin'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle } from 'lucide-react'

const UsersPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [userForNotes, setUserForNotes] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'call' | 'issue' | 'general'>('general')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'driver' as 'admin' | 'driver' | 'customer',
    sendInvite: true,
  })

  const { data, isLoading } = useAdminUsers({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
  })

  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const addNoteMutation = useAddUserNote()
  const createUserMutation = useCreateUser()

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser._id,
        data: {
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          role: editingUser.role,
          isActive: editingUser.isActive,
          username: editingUser.username,
          address: editingUser.address,
          businessName: editingUser.businessName,
          bankDetails: editingUser.bankDetails,
        },
      })
      setIsEditDialogOpen(false)
      setEditingUser(null)
      setSuccessMessage('User updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to update user')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      await deleteUserMutation.mutateAsync(userToDelete)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      setSuccessMessage('User deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete user')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleAddNote = async () => {
    if (!userForNotes || !noteText.trim()) return
    try {
      await addNoteMutation.mutateAsync({
        id: userForNotes._id,
        text: noteText,
        type: noteType,
      })
      setNoteText('')
      setNoteType('general')
      setIsNotesDialogOpen(false)
      setUserForNotes(null)
      setSuccessMessage('Note added successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to add note')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return
    try {
      const result = await createUserMutation.mutateAsync(newUser)
      setIsCreateDialogOpen(false)
      setNewUser({ name: '', email: '', phone: '', role: 'driver', sendInvite: true })
      setSuccessMessage(result.message + (result.inviteStatus === 'sent' ? ' Invite email sent.' : ''))
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to create user')
      setTimeout(() => setErrorMessage(''), 4000)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'driver':
        return 'default'
      case 'customer':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
            <p className="text-muted-foreground">Manage all users, drivers, and customers</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add user
          </Button>
        </div>

        {successMessage && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Search and filter users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={(value) => {
                setRoleFilter(value)
                setPage(1)
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="driver">Drivers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {data?.users?.map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{user.name}</h3>
                          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                          {user.applicationStatus === 'pending' && (
                            <Badge variant="secondary">Application pending</Badge>
                          )}
                          {user.applicationStatus === 'rejected' && (
                            <Badge variant="destructive">Application declined</Badge>
                          )}
                          {!user.isActive && !user.applicationStatus && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                        )}
                        {user.notes && user.notes.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.notes.length} note{user.notes.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserForNotes(user)
                            setIsNotesDialogOpen(true)
                          }}
                          title="Add note"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user._id)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {data?.pagination && data.pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {data.pagination.page} of {data.pagination.pages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                        disabled={page === data.pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={editingUser.name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={editingUser.username || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={editingUser.address || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={editingUser.businessName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Bank Details</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Account Name</Label>
                      <Input
                        value={editingUser.bankDetails?.accountName || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          bankDetails: { ...editingUser.bankDetails, accountName: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Account Number</Label>
                        <Input
                          value={editingUser.bankDetails?.accountNumber || ''}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            bankDetails: { ...editingUser.bankDetails, accountNumber: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Sort Code</Label>
                        <Input
                          value={editingUser.bankDetails?.sortCode || ''}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            bankDetails: { ...editingUser.bankDetails, sortCode: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        value={editingUser.bankDetails?.bankName || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          bankDetails: { ...editingUser.bankDetails, bankName: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateUserMutation.isLoading}>
                {updateUserMutation.isLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This will deactivate their account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteUserMutation.isLoading}>
                {deleteUserMutation.isLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>
                Add a note for {userForNotes?.name || 'this user'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Note Type</Label>
                <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter note details..."
                  rows={4}
                />
              </div>
              {userForNotes?.notes && userForNotes.notes.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="mb-2">Previous Notes</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userForNotes.notes.map((note: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">{note.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs">{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsNotesDialogOpen(false)
                setNoteText('')
                setNoteType('general')
                setUserForNotes(null)
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim() || addNoteMutation.isLoading}>
                {addNoteMutation.isLoading ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Create an admin or driver account. An invite email can be sent to set their password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(value: 'admin' | 'driver' | 'customer') => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendInvite"
                  checked={newUser.sendInvite}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, sendInvite: checked === true })}
                />
                <Label htmlFor="sendInvite">Send account setup invite email</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isLoading}>
                {createUserMutation.isLoading ? 'Creating...' : 'Create user'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default UsersPage

