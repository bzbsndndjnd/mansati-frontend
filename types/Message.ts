// تعريف شكل بيانات الرسالة
export interface Message {
  _id: string; // معرف الرسالة
  sender:
    | {
        _id: string;
        name: string;
        avatar?: string;
      }
    | string; // المرسل (ممكن يكون Object أو مجرد ObjectId كسلسلة)
  receiver:
    | {
        _id: string;
        name: string;
        avatar?: string;
      }
    | string; // المستقبل (ممكن يكون Object أو مجرد ObjectId كسلسلة)
  text: string; // نص الرسالة
  read?: boolean; // هل تمت قراءة الرسالة (اختياري)
  readAt?: string; // وقت القراءة (اختياري)
  createdAt: string; // وقت إنشاء الرسالة
  updatedAt?: string; // وقت آخر تعديل (اختياري)
}
