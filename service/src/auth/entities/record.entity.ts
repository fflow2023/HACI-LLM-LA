import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";

@Entity("chat_records")
export class ChatRecord {
  @PrimaryGeneratedColumn({ comment: "记录ID" })
  id: number;

  // 修正关联关系配置
  @ManyToOne(() => User, (user) => user.username, {
    onDelete: "CASCADE",
    orphanedRowAction: "delete", // 确保级联删除
  })
  @JoinColumn({
    name: "username", // 当前表的字段名
    referencedColumnName: "username", // 关联到User表的username字段
  })
  user: User;

  // 定义外键字段（不单独使用@Column）
  @Column({
    type: "varchar",
    length: 9,
    nullable: false,
    comment: "学号（外键引用）",
  })
  username: string; // 仅作为外键字段

  @Column({
    type: "varchar",
    length: 30,
    comment: "姓名（冗余存储）",
  })
  name: string;

  @Column({ type: "text", comment: "用户提问内容" })
  question: string;

  @Column({ type: "text", comment: "AI回答内容" })
  answer: string;

  @Column({
    type: "varchar",
    length: 50,
    comment: "使用的教师角色",
    default: "strict",
  })
  characterUsed: string;

  @Column({
    type: "enum",
    enum: ["japanese", "english", "none", "corpus_default"],
    default: "none",
    comment: "使用的知识库类型（日语/英语/无/语料库默认）",
  })
  knowledgeBase: string;

  @CreateDateColumn({
    type: "timestamp",
    name: "created_at",
    comment: "创建时间",
  })
  createdAt: Date;
}
