"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const messaging_service_1 = require("../services/messaging.service");
const message_routing_service_1 = require("../services/message-routing.service");
// Initialize service
const messageRoutingService = new message_routing_service_1.MessageRoutingService();
/** Handles incoming messages from renderer processes
 *
 * When a message is received, it validates the channel using the MessageRoutingService.
 * If the channel is valid, it routes the message through the MessagingService and returns a success response.
 * If the channel is invalid, it returns an error response with details.
 * In case of unexpected errors during processing, it logs the error and returns a failure response.
 *
 * @param event - The IPC event object.
 * @param channel - The channel name of the incoming message.
 * @param payload - The payload of the incoming message.
 * @returns A promise that resolves to a GenericResponse indicating the result of the message handling.
*/
electron_1.ipcMain.handle('message', async (event, { channel, payload }) => {
    try {
        // Validate channel using service
        const validation = messageRoutingService.validateChannel(channel);
        if (!validation.valid) {
            return messageRoutingService.createMessageResponse('error', undefined, undefined, validation.error);
        }
        // Route message through messaging service
        messaging_service_1.messagingService.emit(validation.sanitizedChannel, payload, event.sender);
        // Return success response
        return messageRoutingService.createMessageResponse('received', validation.sanitizedChannel, payload);
    }
    catch (error) {
        console.error('[message-handler] Unexpected error:', error);
        return messageRoutingService.createMessageResponse('error', undefined, undefined, error instanceof Error ? error.message : 'Unexpected error');
    }
});
