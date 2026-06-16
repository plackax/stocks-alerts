import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('alerts')
@Index(['symbol', 'triggered', 'targetPrice'])
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  symbol: string;

  @Column({
    name: 'target_price',
    type: 'decimal',
    precision: 12,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  targetPrice: number;

  @Column({ default: false })
  triggered: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
