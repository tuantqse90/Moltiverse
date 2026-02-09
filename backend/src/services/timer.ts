import { EventEmitter } from 'events';
import { BlockchainService } from './blockchain.js';

export class TimerService extends EventEmitter {
  private blockchain: BlockchainService;
  private intervalId?: NodeJS.Timeout;
  private checkIntervalMs = 1000; // Check every second

  constructor(blockchain: BlockchainService) {
    super();
    this.blockchain = blockchain;
  }

  start() {
    this.intervalId = setInterval(async () => {
      try {
        const roundInfo = await this.blockchain.getCurrentRoundInfo();

        // Emit countdown event
        this.emit('countdown', {
          round: roundInfo.round,
          timeRemaining: roundInfo.timeRemaining,
          potAmount: roundInfo.potAmount,
          participantCount: roundInfo.participantCount,
        });

        // Check if round ended and needs winner draw
        if (roundInfo.isEnded && roundInfo.participantCount >= 2) {
          this.emit('roundEnded', roundInfo);

          try {
            console.log(`Drawing winner for round ${roundInfo.round}...`);
            await this.blockchain.drawWinner();
            console.log(`Winner drawn for round ${roundInfo.round}`);
          } catch (error) {
            console.error('Failed to draw winner:', error);
          }
        } else if (roundInfo.isEnded && roundInfo.participantCount < 2 && roundInfo.participantCount > 0) {
          // Force new round if not enough participants
          try {
            console.log('Not enough participants, forcing new round...');
            this.emit('roundEndedNoWinner', {
              round: roundInfo.round,
              participantCount: roundInfo.participantCount,
              message: 'Not enough participants - refunding entries',
            });
            await this.blockchain.forceNewRound();
          } catch (error) {
            console.error('Failed to force new round:', error);
          }
        } else if (roundInfo.isEnded && roundInfo.participantCount === 0) {
          // Round ended with no participants - force new round
          console.log(`Round ${roundInfo.round} ended with no participants`);
          try {
            await this.blockchain.forceNewRound();
            console.log('New round started!');
            this.emit('roundStarted', {
              message: 'New round started',
            });
          } catch (error: any) {
            // Ignore if already in a new round
            if (!error.message?.includes('already')) {
              console.error('Failed to start new round:', error.message);
            }
          }
        }
      } catch (error) {
        console.error('Timer tick error:', error);
      }
    }, this.checkIntervalMs);

    console.log('Timer service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Timer service stopped');
    }
  }
}
