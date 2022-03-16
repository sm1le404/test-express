import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

import { Length, IsNotEmpty } from 'class-validator';
import * as bcrypt from 'bcryptjs';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty()
  extId: string;

  @Column()
  @Length(4, 20)
  pwd: string;

  @Column({ nullable: true })
  @Length(2, 100)
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastLogin: Date;

  @CreateDateColumn()
  dateCreate: Date;

  @Column({ default: true })
  isActive: boolean;

  hashPassword() {
    this.pwd = bcrypt.hashSync(this.pwd, 8);
  }
  checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
    return bcrypt.compareSync(unencryptedPassword, this.pwd);
  }
}
