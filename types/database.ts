export type UserRole = 'ADMIN' | 'TRANSLATOR' | 'ANNOTATOR';

export type TaskType = 'NLU' | 'NLR' | 'NLG';

export type PromptStatus = 'pending' | 'in_progress' | 'done';

export interface User {
  id: string;
  user_id: string; // User ID for login (not email)
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Context {
  sender: {
    nature_of_the_interaction: string;
    platform_type: string;
  };
  recipient: {
    type: string;
    background: string | { [key: string]: any };
  };
  transmission_principle: {
    urgency?: string;
    sender_purpose: string;
    confidentiality: string;
    source_accountability: string;
  };
}

export interface Prompt {
  id: string;
  task_instance_id: string;
  base_id: string;
  english_text: string;
  filipino_text: string;
  task_type: TaskType;
  category: string;
  instruction?: string;
  context: Context;
  context_intended_to_be_safe: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  prompt_id: string;
  status: PromptStatus;
  assigned_at: string;
  completed_at?: string;
}

export interface Evaluation {
  id: string;
  user_id: string;
  prompt_id: string;
  translation_correct?: boolean;
  revised_translation?: string;
  safety_label?: string; // 'Safe' | 'Unsafe' | 'Violates Policy' | 'Does not Violate Policy' | 'Answer' | 'Refuse'
  submitted_at: string;
}
