export type Organization = {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type Member = {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  auth_user_id: string | null
  created_at: string
}

export type Production = {
  id: string
  organization_id: string
  name: string
  performance_date: string | null
  notes: string | null
  stage_width_ken: number | null
  stage_depth_ken: number | null
  created_at: string
}

export type CastGroup = {
  id: string
  production_id: string
  name: string
  color: string
  order_index: number
  created_at: string
}

export type ProductionMember = {
  id: string
  production_id: string
  member_id: string
  role_name: string | null
}

export type ProductionMemberGroup = {
  id: string
  production_member_id: string
  cast_group_id: string
}

export type Scene = {
  id: string
  production_id: string
  name: string
  scene_type: string | null
  uses_mic: boolean
  order_index: number
  created_at: string
}

export type SceneGroup = {
  id: string
  production_id: string
  name: string
  color: string
  order_index: number
  created_at: string
}

export type SceneSceneGroup = {
  id: string
  scene_id: string
  scene_group_id: string
}

export type SceneCast = {
  id: string
  scene_id: string
  member_id: string
  role_name: string | null
}

export type Schedule = {
  id: string
  production_id: string
  date: string
  location: string | null
  notes: string | null
  created_at: string
}

export type Attendance = {
  id: string
  schedule_id: string
  member_id: string
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'unknown'
  notes: string | null
}

export type ScheduleScene = {
  id: string
  schedule_id: string
  scene_id: string
}

export type PropStatus = 'pending' | 'in_progress' | 'ready'

export type Prop = {
  id: string
  production_id: string
  name: string
  shape: 'rect' | 'circle' | 'triangle'
  color: string
  default_width: number
  default_height: number
  status: PropStatus
  owner: string | null
  notes: string | null
  on_stage: boolean
  created_at: string
}

export type StageDiagram = {
  id: string
  scene_id: string
  width_ken: number
  depth_ken: number
  canvas_width: number
  canvas_height: number
  page_number: number
  page_name: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export type PropPlacement = {
  id: string
  stage_diagram_id: string
  prop_id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  label: string | null
  created_at: string
}

export type MizenPlacement = {
  id: string
  stage_diagram_id: string
  scene_cast_id: string
  x: number
  y: number
  direction: number
  label: string | null
  created_at: string
}
