import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'varchar',
    unique: true,
    length: 30,
    nullable: false, 
    comment: '登录用户名' 
  })
  username: string;

  @Column({ 
    type: 'varchar',
    unique: false,
    length: 30,
    comment: 'email(temp)' ,
    default: null,
  })
  email: string;

  @Column({ 
    type: 'char',
    length: 60,
    nullable: false, 
    comment: '加密后的密码' 
  })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    comment: '用户角色',
    nullable: false // 禁止空值
  })
  role: UserRole; 

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,  
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' // 明确指定列名
  })
  createdAt: Date;
}