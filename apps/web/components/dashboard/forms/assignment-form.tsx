"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

interface AssignmentFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: AssignmentFormData) => void;
}

export interface AssignmentFormData {
    title: string;
    description: string;
    dueDate: string;
    totalPoints: number;
}

export function AssignmentForm({ open, onOpenChange, onSubmit }: AssignmentFormProps) {
    const [formData, setFormData] = useState<AssignmentFormData>({
        title: "",
        description: "",
        dueDate: "",
        totalPoints: 100,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ title: "", description: "", dueDate: "", totalPoints: 100 });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>إضافة واجب جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">عنوان الواجب</label>
                        <Input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="مثال: واجب الرياضيات - الفصل الثالث"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">الوصف</label>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="تفاصيل الواجب"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">تاريخ التسليم</label>
                            <DatePicker
                                value={formData.dueDate}
                                onChange={(dueDate) => setFormData({ ...formData, dueDate })}
                                placeholder="اختر تاريخ التسليم"
                                ariaLabel="تاريخ التسليم"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">الدرجة الكلية</label>
                            <Input
                                type="number"
                                required
                                min="1"
                                value={formData.totalPoints}
                                onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            إلغاء
                        </Button>
                        <Button type="submit">حفظ الواجب</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
