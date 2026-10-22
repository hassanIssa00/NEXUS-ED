import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ErrorNotice, SectionHeading, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Entry = { path: string; value: string };
const labels: Record<string,string> = { name:'الاسم',firstName:'الاسم الأول',lastName:'اسم العائلة',email:'البريد الإلكتروني',phone:'رقم الجوال',class:'الفصل',className:'الفصل',subject:'المادة',grade:'الدرجة',score:'النتيجة',maxScore:'الدرجة الكاملة',status:'الحالة',date:'التاريخ',createdAt:'تاريخ التسجيل',enrolledAt:'تاريخ الالتحاق',attendance:'الحضور',attendanceRate:'نسبة الحضور',overallGrade:'متوسط الدرجات',assignmentsCompleted:'الواجبات المنجزة',totalAssignments:'إجمالي الواجبات',rank:'الترتيب',period:'الفترة',recommendations:'التوصيات',studentInfo:'بيانات الطالب',summary:'الملخص',subjects:'المواد',recentGrades:'أحدث الدرجات',enrollments:'التسجيلات',studentProfile:'الملف الدراسي',teacher:'المعلم',title:'العنوان',assignment:'التكليف',present:'حاضر',absent:'غائب',late:'متأخر',excused:'بعذر' };
function flatten(value:any,path='سجل الطالب',depth=0):Entry[]{
 if(value===null||value===undefined||value==='')return [];
 if(Array.isArray(value))return value.slice(0,50).flatMap((item,index)=>flatten(item,`${path} · ${index+1}`,depth+1));
 if(typeof value==='object')return Object.entries(value).flatMap(([key,item])=>flatten(item,depth?`${path} · ${labels[key]??key}`:(labels[key]??key),depth+1));
 const display=typeof value==='boolean'?(value?'نعم':'لا'):String(value);
 return [{path,value:display}];
}
function formatPath(path:string){return path.replaceAll(' · ', ' / ');}

export default function StudentRecordScreen(){
 const router=useRouter();const params=useLocalSearchParams<{id?:string|string[];name?:string|string[]}>();const id=Array.isArray(params.id)?params.id[0]??'':params.id??'';const name=Array.isArray(params.name)?params.name[0]??'':params.name??'ملف الطالب';const {user}=useAuth();const role=(user?.role??'').toUpperCase();const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 useEffect(()=>{let active=true;if(!id){setError('معرّف الطالب غير موجود.');setLoading(false);return;}const endpoint=role==='PARENT'?`/analytics/student/${encodeURIComponent(id)}/parent-report?period=month`:`/users/students/${encodeURIComponent(id)}/record`;apiClient.get(endpoint).then(({data:response})=>{if(active)setData(response?.data??response);}).catch((reason)=>{const message=reason?.response?.data?.message; if(active)setError(Array.isArray(message)?message.join('، '):message||'تعذر تحميل ملف الطالب من النظام.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id,role]);
 const entries=useMemo(()=>flatten(data),[data]);
 return <AppPage><BrandHeader/><View style={styles.heading}><TouchableOpacity accessibilityRole="button" onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-forward" size={19} color={BRAND.ink}/><Text style={styles.backText}>العودة</Text></TouchableOpacity><Text style={styles.eyebrow}>ملف الطالب</Text><Text style={styles.title}>{name}</Text><Text style={styles.subtitle}>{role==='PARENT'?'تقرير الابن المرتبط بالحساب من سجلات المدرسة.':'بيانات الطالب المصرح بها لحسابك من قاعدة المدرسة.'}</Text></View>{error?<ErrorNotice>{error}</ErrorNotice>:null}{loading?<ActivityIndicator color={BRAND.teal} size="large" style={{marginVertical:24}}/>:null}{!loading&&!error&&entries.length?<Surface><SectionHeading title="كل السجلات المرتبطة"/><View style={styles.list}>{entries.map((entry,index)=><View key={`${entry.path}-${index}`} style={styles.entry}><Text selectable style={styles.value}>{entry.value}</Text><Text style={styles.label}>{formatPath(entry.path)}</Text></View>)}</View></Surface>:null}{!loading&&!error&&!entries.length?<Surface><Text style={styles.empty}>لا توجد ملفات أو سجلات إضافية مرتبطة بهذا الطالب حاليًا.</Text></Surface>:null}</AppPage>;
}

const styles=StyleSheet.create({heading:{gap:6,alignItems:'flex-end'},back:{minHeight:38,flexDirection:'row-reverse',alignItems:'center',gap:5,alignSelf:'flex-start',paddingHorizontal:10,borderWidth:1,borderColor:BRAND.line,borderRadius:10,backgroundColor:'#FFFFFF'},backText:{color:BRAND.ink,fontSize:12,fontWeight:'700',writingDirection:'rtl'},eyebrow:{color:BRAND.teal,fontSize:12,fontWeight:'800',textAlign:'right',writingDirection:'rtl'},title:{color:BRAND.ink,fontSize:22,fontWeight:'900',textAlign:'right',writingDirection:'rtl'},subtitle:{color:BRAND.muted,fontSize:12,lineHeight:19,textAlign:'right',writingDirection:'rtl'},list:{gap:0},entry:{flexDirection:'row-reverse',alignItems:'flex-start',justifyContent:'space-between',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:BRAND.line},label:{flex:1,color:BRAND.muted,fontSize:12,lineHeight:18,textAlign:'right',writingDirection:'rtl'},value:{flex:1,color:BRAND.ink,fontSize:12,lineHeight:18,fontWeight:'700',textAlign:'left'},empty:{color:BRAND.muted,fontSize:13,lineHeight:20,textAlign:'center',writingDirection:'rtl',padding:14}});
