import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderType, OrderStatus, DexType } from '../types/order.types';

@Entity('orders')
export class Order {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.MARKET,
  })
  orderType!: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 100 })
  tokenIn!: string;

  @Column({ type: 'varchar', length: 100 })
  tokenOut!: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amountIn!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  slippage!: number;

  @Column({
    type: 'enum',
    enum: DexType,
    nullable: true,
  })
  selectedDex?: DexType;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  executedPrice?: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  amountOut?: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  txHash?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  executedAt?: Date;
}