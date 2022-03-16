import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

import { User } from './User';

@Entity()
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  path: string;

  @Column()
  size: number;

  @Column()
  type: string;

  @Column()
  extension: string;

  @CreateDateColumn()
  dateCreate: Date;

  @UpdateDateColumn()
  dateUpdate: Date;

  @ManyToOne(() => User)
  owner: User;
}
