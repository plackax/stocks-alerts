import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AlertEntity } from '../../alerts/entities/alert.entity';
import { DeviceTokenEntity } from './device-token.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @OneToMany(() => AlertEntity, (alert) => alert.user)
  alerts: AlertEntity[];

  @OneToMany(() => DeviceTokenEntity, (deviceToken) => deviceToken.user)
  deviceTokens: DeviceTokenEntity[];
}
