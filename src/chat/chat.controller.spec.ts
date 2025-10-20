import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    listChannelsForUser: jest.fn(),
    getOrCreateDirectChannel: jest.fn(),
    createGroupChannel: jest.fn(),
    listMessages: jest.fn(),
    sendMessage: jest.fn(),
    markRead: jest.fn(),
  } as unknown as jest.Mocked<ChatService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);

    jest.clearAllMocks();
  });

  const mockReq = (userId: string = 'user-1') => ({ user: { id: userId } });

  it('should list channels', async () => {
    const expected = { items: [{ id: 'c1' }], nextCursor: null };
    mockChatService.listChannelsForUser = jest.fn().mockResolvedValue(expected);

    const res = await controller.listChannels(mockReq() as any, 10, undefined);

    expect(mockChatService.listChannelsForUser).toHaveBeenCalledWith('user-1', 10, undefined);
    expect(res).toEqual({ success: true, data: expected });
  });

  it('should get or create direct channel', async () => {
    const channel = { id: 'direct-1', type: 'direct' };
    mockChatService.getOrCreateDirectChannel = jest.fn().mockResolvedValue(channel);

    const res = await controller.getOrCreateDirect(mockReq() as any, 'user-2');

    expect(mockChatService.getOrCreateDirectChannel).toHaveBeenCalledWith('user-1', 'user-2');
    expect(res).toEqual({ success: true, data: channel });
  });

  it('should create group channel', async () => {
    const channel = { id: 'group-1', type: 'group', name: 'My Group' };
    mockChatService.createGroupChannel = jest.fn().mockResolvedValue(channel);

    const res = await controller.createGroup(mockReq() as any, { name: 'My Group', members: ['u2', 'u3'] });

    expect(mockChatService.createGroupChannel).toHaveBeenCalledWith('user-1', 'My Group', ['u2', 'u3']);
    expect(res).toEqual({ success: true, data: channel });
  });

  it('should list messages', async () => {
    const messages = { items: [{ id: 'm1', text: 'hi' }], nextCursor: null };
    mockChatService.listMessages = jest.fn().mockResolvedValue(messages);

    const res = await controller.listMessages(mockReq() as any, 'channel-1', 50, undefined);

    expect(mockChatService.listMessages).toHaveBeenCalledWith('channel-1', 50, undefined);
    expect(res).toEqual({ success: true, data: messages });
  });

  it('should send message', async () => {
    const msg = { id: 'm2', text: 'hello' };
    mockChatService.sendMessage = jest.fn().mockResolvedValue(msg);

    const res = await controller.sendMessage(mockReq() as any, 'channel-1', { text: 'hello' });

    expect(mockChatService.sendMessage).toHaveBeenCalledWith('channel-1', 'user-1', 'hello');
    expect(res).toEqual({ success: true, data: msg });
  });

  it('should mark channel as read', async () => {
    const result = { ok: true };
    mockChatService.markRead = jest.fn().mockResolvedValue(result);

    const res = await controller.markRead(mockReq() as any, 'channel-1', {} as any);

    expect(mockChatService.markRead).toHaveBeenCalled();
    expect(res).toEqual({ success: true, data: result });
  });
});


