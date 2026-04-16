import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MessagingService } from './messaging/messaging.service';

@Injectable({
  providedIn: 'root'
})
export class RconManagementService {
  
  readonly knownRconCommands: string[] = [
    // 服务器管理
    'ListPlayers',
    'SaveWorld',
    'DoExit',
    'GetServerInfo',
    'GetChat',
    'ServerChatToPlayer <PlayerName> <Message>',
    'ServerChatTo <SteamID> <Message>',
    'ServerChat <Message>',
    'Broadcast <Message>',

    // 玩家管理
    'KickPlayer <SteamID>',
    'BanPlayer <SteamID>',
    'UnbanPlayer <SteamID>',
    'AllowPlayerToJoinNoCheck <SteamID>',
    'DisallowPlayerToJoinNoCheck <SteamID>',
    'SetMessageOfTheDay <Message>',

    // 游戏控制
    'PlayersOnly',
    'SetTimeOfDay <HH:MM:SS>',
    'SetDifficultyValue <Value>',
    'SetGlobalPause <0|1>',
    'CE <EventName>',

    // 部落管理
    'TribeMessage <TribeID> <Message>',
    'GetTribeIdPlayerList <TribeID>',
    'GetTribeInfo <TribeID>',
    'GetTribeDinoCount <TribeID>',
    'GetTribeStructureCount <TribeID>',
    'ForcePlayerToJoinTribe <PlayerID> <TribeID>',
    'ForcePlayerToJoinTargetTribe <PlayerID>',
    'MakeTribeAdmin <TribeID>',
    'MakeTribeFounder <TribeID>',
    'RemoveTribeAdmin <TribeID>',
    'DestroyTribe <TribeID>',
    'DestroyTribeIdStructures <TribeID>',
    'DestroyTribeIdDinos <TribeID>',
    'DestroyTribeIdPlayers <TribeID>',

    // 作弊命令（需要 cheat 前缀）
    'cheat GiveItemNum <ItemID> <Quantity> <Quality> <ForceBlueprint>',
    'cheat GFI <BlueprintPath> <Quantity> <Quality> <ForceBlueprint>',
    'cheat God',
    'cheat InfiniteStats',
    'cheat Fly',
    'cheat Walk',
    'cheat Ghost',
    'cheat Teleport',
    'cheat TeleportToPlayer <PlayerID>',
    'cheat TeleportPlayerIDToMe <PlayerID>',
    'cheat TeleportPlayerNameToMe <PlayerName>',
    'cheat SummonTamed <DinoClass>',
    'cheat GMSummon <DinoClass> <Level>',
    'cheat DestroyAllEnemies',
    'cheat DestroyWildDinos',
    'cheat HurtMe <Amount>',
    'cheat SetTargetDinoColor <ColorRegion> <ColorID>',
    'cheat ClearPlayerInventory <PlayerID> <bClearInventory> <bClearSlotItems> <bClearEquippedItems>',
    'cheat AddExperience <Amount> <bFromTribeShare> <bPreventSharingWithTribe>',
    'cheat SetPlayerPos <X> <Y> <Z>',
    'cheat SetTimeOfDay <HH:MM:SS>',
    'cheat Weather <WeatherType>',
    'cheat GiveResources',
    'cheat GiveEngramsTekOnly',
    'cheat UnlockEngram <EngramPath>',
    'cheat LevelUpTarget',
    'cheat LevelUpAOE <Radius> <Levels>',
    'cheat ForcePlayerDie <PlayerID>',
    'cheat KillPlayer <PlayerID>',
    'cheat Slomo <Value>',
    'cheat RenamePlayer <PlayerName> <NewName>',
    'cheat RenameTribe <TribeName> <NewName>',
    'cheat SetAdminIcon <0|1>',
    'cheat ListActiveHordeEvents',
    'cheat RemoveAllWorldBuffs',
    'cheat RepairArea <Radius>',
    'cheat PrintColors',
  ];

  constructor(private messaging: MessagingService) {}

  /**
   * Send an RCON command to the specified server
   */
  sendRconCommand(serverId: string, command: string): Observable<any> {
    if (!command?.trim() || !serverId) {
      throw new Error('Server ID and command are required');
    }

    return this.messaging.sendMessage('rcon-command', {
      id: serverId,
      command: command
    });
  }

  /**
   * Get the list of known RCON commands for UI suggestions
   */
  getKnownCommands(): string[] {
    return [...this.knownRconCommands];
  }

  /**
   * Validate if a command is non-empty and properly formatted
   */
  isValidCommand(command: string): boolean {
    return !!(command && command.trim().length > 0);
  }

  /**
   * Subscribe to RCON status updates
   */
  subscribeToRconStatus(): Observable<any> {
    return this.messaging.receiveMessage('rcon-status');
  }
}